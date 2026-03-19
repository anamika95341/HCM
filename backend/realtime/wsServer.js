const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
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
  const socketsByCitizenId = new Map();
  const subscribedChannels = new Set();

  subscriber.on('message', (channel, rawMessage) => {
    const citizenId = channel.split(':')[1];
    const sockets = socketsByCitizenId.get(citizenId) || new Set();
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

      const config = getRoleConfig('citizen');
      const payload = jwt.verify(token, config.publicKey, {
        algorithms: ['RS256'],
        audience: 'citizen',
        issuer: config.issuer,
      });

      const citizenId = payload.sub;
      const channel = `citizen:${citizenId}`;

      if (!subscribedChannels.has(channel)) {
        await subscriber.subscribe(channel);
        subscribedChannels.add(channel);
      }

      if (!socketsByCitizenId.has(citizenId)) {
        socketsByCitizenId.set(citizenId, new Set());
      }
      socketsByCitizenId.get(citizenId).add(ws);
      redis.incr('metrics:ws:active').catch(() => {});

      ws.on('close', async () => {
        const sockets = socketsByCitizenId.get(citizenId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            socketsByCitizenId.delete(citizenId);
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
