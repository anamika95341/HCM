const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const createHttpError = require('http-errors');
const env = require('./config/env');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const citizenRoutes = require('./modules/citizen/citizen.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const masteradminRoutes = require('./modules/masteradmin/masteradmin.routes');
const ministerRoutes = require('./modules/minister/minister.routes');
const deoRoutes = require('./modules/deo/deo.routes');
const meetingRoutes = require('./modules/meetings/meetings.routes');
const complaintRoutes = require('./modules/complaints/complaints.routes');
const filesRoutes = require('./modules/files/files.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  }));

  app.use(cors((req, callback) => {
    const origin = req.get('origin');
    const forwardedHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
    const forwardedProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
    const inferredOrigin = forwardedHost
      ? `${forwardedProto || req.protocol}://${forwardedHost}`
      : '';

    if (!origin || env.frontendOrigins.includes(origin) || (inferredOrigin && origin === inferredOrigin)) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'X-XSRF-TOKEN', 'X-Request-ID', 'Idempotency-Key'],
      });
    }

    if (env.nodeEnv === 'production' && env.frontendOrigins.length === 0) {
      return callback(new Error('Origin not allowed by CORS'));
    }

    return callback(new Error('Origin not allowed by CORS'));
  }));

  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));
  app.use(cookieParser());
  app.use(metricsMiddleware);
  app.use(rateLimiter.general);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', pid: process.pid });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/citizen', citizenRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/masteradmin', masteradminRoutes);
  app.use('/api/v1/minister', ministerRoutes);
  app.use('/api/v1/deo', deoRoutes);
  app.use('/api/v1/meetings', meetingRoutes);
  app.use('/api/v1/complaints', complaintRoutes);
  app.use('/api/v1/files', filesRoutes);

  app.use((req, res, next) => {
    next(createHttpError(404, 'Resource not found'));
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
