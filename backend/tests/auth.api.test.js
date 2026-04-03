jest.mock('../middleware/metricsMiddleware', () => jest.fn((req, res, next) => next()));
jest.mock('../middleware/rateLimiter', () => ({
  general: (req, res, next) => next(),
  auth: (req, res, next) => next(),
}));
jest.mock('../middleware/authenticate', () => jest.fn(() => (req, res, next) => {
  req.user = { role: 'citizen' };
  req.token = 'access-token';
  next();
}));
jest.mock('../modules/auth/auth.service', () => ({
  loginCitizen: jest.fn(),
  logout: jest.fn(),
  resetCitizenPassword: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const authService = require('../modules/auth/auth.service');
const authRoutes = require('../modules/auth/auth.routes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use((error, req, res, next) => {
    res.status(error.statusCode || error.status || 500).json({ error: error.message });
  });
  return app;
}

describe('auth API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/v1/auth/citizen/login returns session payload', async () => {
    authService.loginCitizen.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token-refresh-token',
      user: { id: 'user-1' },
    });

    const app = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/citizen/login')
      .send({ citizenId: 'CTZ12345678', password: 'StrongPass123!' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      accessToken: 'access-token',
      refreshToken: 'refresh-token-refresh-token',
    }));
    expect(authService.loginCitizen).toHaveBeenCalled();
  });

  test('POST /api/v1/auth/citizen/reset-password returns success message', async () => {
    authService.resetCitizenPassword.mockResolvedValue({
      message: 'Password reset completed if the account exists.',
    });

    const app = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/citizen/reset-password')
      .send({ citizenId: 'CTZ12345678', otp: '123456', password: 'StrongPass123!', confirmPassword: 'StrongPass123!' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password reset completed if the account exists.' });
    expect(authService.resetCitizenPassword).toHaveBeenCalled();
  });

  test('POST /api/v1/auth/citizen/logout returns success message', async () => {
    authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

    const app = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/citizen/logout')
      .send({ refreshToken: 'refresh-token-refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    expect(authService.logout).toHaveBeenCalledWith(
      'citizen',
      'access-token',
      'refresh-token-refresh-token',
      expect.objectContaining({ ip: expect.any(String) }),
    );
  });
});
