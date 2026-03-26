jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  get: jest.fn(),
}));

jest.mock('../modules/auth/auth.repository', () => ({
  findActiveUserById: jest.fn(),
}));

jest.mock('../config/jwt', () => ({
  getRoleConfig: jest.fn(() => ({
    publicKey: 'public-key',
    issuer: 'issuer',
  })),
}));

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const authRepository = require('../modules/auth/auth.repository');
const authenticate = require('../middleware/authenticate');

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a valid token when the backing account is inactive or removed', async () => {
    jwt.verify.mockReturnValue({ sub: 'admin-1', jti: 'token-1', aud: 'admin', role: 'admin' });
    redis.get.mockResolvedValue(null);
    authRepository.findActiveUserById.mockResolvedValue(null);

    const middleware = authenticate('admin');
    const req = {
      headers: { authorization: 'Bearer token' },
      originalUrl: '/api/v1/admin/work-queue',
      method: 'GET',
      ip: '127.0.0.1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
