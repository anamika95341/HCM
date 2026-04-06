const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const { buildChannel } = require('./wsPublisher');
const logger = require('../utils/logger');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token');
}

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

      if (!subscribedChannels.has(channel)) {
        await subscriber.subscribe(channel);
        subscribedChannels.add(channel);
      }

      if (!socketsByChannel.has(channel)) {
        socketsByChannel.set(channel, new Set());
      }
      socketsByChannel.get(channel).add(ws);
      redis.incr('metrics:ws:active').catch(() => {});

      ws.on('close', async () => {
        const sockets = socketsByChannel.get(channel);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            socketsByChannel.delete(channel);
            await subscriber.unsubscribe(channel);
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
    for (const client of wss.clients) {
      client.close();
    }
    await subscriber.quit();
  }

  return { shutdown };
}

module.exports = { initializeWebSocket };
