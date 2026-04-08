'use strict';

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const { buildChannel } = require('./wsPublisher');
const logger = require('../utils/logger');

// WHY: JWT in URL query params are logged by proxies/CDNs/access logs — security risk.
// URL token retained ONLY in non-production for tooling/testing convenience.
// Remove once all WS clients send the Authorization header.
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  if (process.env.NODE_ENV !== 'production') {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token');
  }
  return null;
}

// How often to ping clients. Connections that miss a pong within one interval
// are terminated. Max zombie lifetime ≈ 2 × HEARTBEAT_INTERVAL_MS.
const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_INTERVAL_MS || 30_000);

function initializeWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const subscriber = redis.duplicate();
  const socketsByChannel = new Map();
  const subscribedChannels = new Set();
  const supportedRoles = new Set(['citizen', 'admin', 'masteradmin', 'minister', 'deo']);

  subscriber.on('message', (channel, rawMessage) => {
    const sockets = socketsByChannel.get(channel) || new Set();
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(rawMessage);
      }
    }
  });

  // WHY: Heartbeat interval sends ping to every connected client. Any client that
  // hasn't responded (isAlive === false from the previous tick) is terminated.
  // This prevents zombie connections accumulating after network failures.
  const heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Stop timer when WSS closes (prevents leaks in tests / graceful shutdown)
  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', async (ws, req) => {
    try {
      const token = extractToken(req);
      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const decoded = jwt.decode(token);
      const role = decoded?.role;
      if (!supportedRoles.has(role)) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const config = getRoleConfig(role);
      const payload = jwt.verify(token, config.publicKey, {
        algorithms: ['RS256'],
        audience: config.audience,
        issuer: config.issuer,
      });

      const recipientId = payload.sub;
      const channel = buildChannel(role, recipientId);

      // WHY: Add to subscribedChannels BEFORE the await to prevent a race condition
      // where two concurrent connections for the same channel both pass the has() check
      // and both call subscriber.subscribe(), creating duplicate subscriptions.
      if (!subscribedChannels.has(channel)) {
        subscribedChannels.add(channel);
        await subscriber.subscribe(channel);
      }

      if (!socketsByChannel.has(channel)) {
        socketsByChannel.set(channel, new Set());
      }
      socketsByChannel.get(channel).add(ws);
      redis.incr('metrics:ws:active').catch(() => {});

      // WHY: isAlive tracking for ping/pong heartbeat. Reset to true on each pong.
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', async () => {
        const sockets = socketsByChannel.get(channel);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            socketsByChannel.delete(channel);
            // WHY: Unsubscribe when last client on channel disconnects to prevent Redis
            // subscription leak. .catch() prevents throw in close handler.
            await subscriber.unsubscribe(channel).catch(() => {});
            subscribedChannels.delete(channel);
          }
        }
        redis.decr('metrics:ws:active').catch(() => {});
      });
    } catch (error) {
      logger.error('WebSocket authentication failed', { error });
      ws.close(4001, 'Unauthorized');
    }
  });

  async function shutdown() {
    clearInterval(heartbeatTimer);
    for (const client of wss.clients) {
      client.close(1001, 'Server shutting down');
    }
    await subscriber.quit().catch(() => {});
  }

  return { shutdown };
}

module.exports = { initializeWebSocket };
