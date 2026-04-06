jest.mock('../middleware/metricsMiddleware', () => jest.fn((req, res, next) => next()));
jest.mock('../middleware/rateLimiter', () => ({
  general: (req, res, next) => next(),
  auth: (req, res, next) => next(),
}));
jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  publish: jest.fn(),
  duplicate: jest.fn(() => ({
    connect: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  })),
  on: jest.fn(),
}));
jest.mock('../middleware/authenticate', () => jest.fn((role) => (req, res, next) => {
  req.user = { sub: 'user-1', role };
  req.authRole = role;
  req.token = 'access-token';
  next();
}));
jest.mock('../middleware/authorize', () => jest.fn(() => (req, res, next) => next()));
jest.mock('../modules/settings/settings.service', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));
jest.mock('../modules/citizen/citizen.controller', () => ({
  getProfile: jest.fn((req, res) => res.json({ profile: {} })),
  getDashboard: jest.fn((req, res) => res.json({})),
  getAdminDirectory: jest.fn((req, res) => res.json({ admins: [] })),
  getMyCases: jest.fn((req, res) => res.json({ complaints: [] })),
  getCaseDetail: jest.fn((req, res) => res.status(404).json({ error: 'Case not found' })),
}));
jest.mock('../modules/admin/admin.controller', () => ({
  getDashboard: jest.fn((req, res) => res.json({})),
  getWorkQueue: jest.fn((req, res) => res.json({})),
  getWorkflowDirectory: jest.fn((req, res) => res.json({})),
  listDeos: jest.fn((req, res) => res.json({ deos: [] })),
}));
jest.mock('../modules/notifications/notifications.controller', () => ({
  getPreferences: jest.fn((req, res) => res.json({ preferences: {} })),
  updatePreferences: jest.fn((req, res) => res.json({ preferences: {} })),
  listNotifications: jest.fn((req, res) => res.json({ notifications: [], unreadCount: 0 })),
  markAllNotificationsRead: jest.fn((req, res) => res.json({ unreadCount: 0 })),
  markNotificationRead: jest.fn((req, res) => res.json({ unreadCount: 0 })),
}));

const request = require('supertest');
const express = require('express');
const settingsService = require('../modules/settings/settings.service');
const citizenRoutes = require('../modules/citizen/citizen.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const authRoutes = require('../modules/auth/auth.routes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/citizen', citizenRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use((error, req, res, next) => {
    res.status(error.statusCode || error.status || 500).json({ error: error.message });
  });
  return app;
}

describe('settings API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/v1/admin/me returns role profile', async () => {
    settingsService.getProfile.mockResolvedValue({
      username: 'admin.demo',
      phone_number: '9876543210',
    });

    const app = makeApp();
    const response = await request(app)
      .get('/api/v1/admin/me')
      .set('Authorization', 'Bearer access-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      profile: {
        username: 'admin.demo',
        phone_number: '9876543210',
      },
    });
    expect(settingsService.getProfile).toHaveBeenCalledWith('admin', 'user-1');
  });

  test('PATCH /api/v1/citizen/me validates and updates profile', async () => {
    settingsService.updateProfile.mockResolvedValue({
      citizen_id: 'CTZ-DEMO-0001',
      mobile_number: '9876543210',
    });

    const app = makeApp();
    const response = await request(app)
      .patch('/api/v1/citizen/me')
      .set('Authorization', 'Bearer access-token')
      .send({ name: 'Citizen Demo', contact: '9876543210', email: 'citizen@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual({
      citizen_id: 'CTZ-DEMO-0001',
      mobile_number: '9876543210',
    });
    expect(settingsService.updateProfile).toHaveBeenCalledWith(
      'citizen',
      'user-1',
      { name: 'Citizen Demo', contact: '9876543210', email: 'citizen@example.com' },
      expect.objectContaining({ ip: expect.any(String) })
    );
  });

  test('POST /api/v1/auth/admin/change-password validates and forwards role context', async () => {
    settingsService.changePassword.mockResolvedValue({ message: 'Password updated successfully' });

    const app = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/admin/change-password')
      .set('Authorization', 'Bearer access-token')
      .send({
        currentPassword: 'StrongPass123!',
        newPassword: 'DifferentPass123!',
        confirmPassword: 'DifferentPass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password updated successfully' });
    expect(settingsService.changePassword).toHaveBeenCalledWith(
      'admin',
      'user-1',
      {
        currentPassword: 'StrongPass123!',
        newPassword: 'DifferentPass123!',
        confirmPassword: 'DifferentPass123!',
      },
      expect.objectContaining({ ip: expect.any(String) })
    );
  });
});
