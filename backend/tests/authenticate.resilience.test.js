jest.mock('jsonwebtoken');
jest.mock('../config/redis', () => ({ get: jest.fn() }));
jest.mock('../config/jwt', () => ({
  getRoleConfig: jest.fn().mockReturnValue({
    publicKey: 'mock-pub-key',
    issuer: 'hcm',
    audience: 'citizen',
  }),
}));
jest.mock('../modules/auth/auth.repository', () => ({
  findActiveUserById: jest.fn(),
}));
jest.mock('../utils/logger', () => ({ warn: jest.fn() }));
jest.mock('../utils/authStream', () => ({ publishAuthEvent: jest.fn().mockResolvedValue(undefined) }));

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const authRepository = require('../modules/auth/auth.repository');
const { publishAuthEvent } = require('../utils/authStream');
const authenticate = require('../middleware/authenticate');

function makeReq(token = 'Bearer mock.token') {
  return {
    headers: { authorization: token },
    cookies: { access_token: 'mock.token' },
    originalUrl: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn((header) => {
      if (header.toLowerCase() === 'user-agent') return 'jest';
      if (header.toLowerCase() === 'x-request-id') return undefined;
      return undefined;
    }),
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware — Redis resilience', () => {
  const validPayload = { sub: 'user-1', role: 'citizen', jti: 'jti-abc', iat: 1000000, exp: 9999999999 };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue(validPayload);
    authRepository.findActiveUserById.mockResolvedValue({ id: 'user-1' });
  });

  test('calls next() when Redis JTI check throws (fail-open)', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('publishes token_revoke_check_bypassed event when Redis JTI check throws', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'token_revoke_check_bypassed', role: 'citizen' }),
    );
  });

  test('returns 401 when JTI is found in revocation list', async () => {
    redis.get
      .mockResolvedValueOnce('1')   // JTI revoked
      .mockResolvedValueOnce(null); // password_changed (not reached)
    const next = jest.fn();
    const res = makeRes();

    await authenticate('citizen')(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when password was changed after token was issued', async () => {
    const iat = Math.floor(Date.now() / 1000) - 300; // token issued 5 minutes ago
    jwt.verify.mockReturnValue({ ...validPayload, iat });
    authRepository.findActiveUserById.mockResolvedValueOnce({
      id: 'user-1',
      password_changed_at: new Date(Date.now() - 60 * 1000).toISOString(),
    });

    redis.get
      .mockResolvedValueOnce(null)       // JTI: not revoked
      .mockResolvedValueOnce(null);      // password_changed cache: miss

    const next = jest.fn();
    const res = makeRes();

    await authenticate('citizen')(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when password_changed key is older than token iat', async () => {
    const iat = Math.floor(Date.now() / 1000) - 60; // token issued 1 min ago
    jwt.verify.mockReturnValue({ ...validPayload, iat });
    authRepository.findActiveUserById.mockResolvedValueOnce({
      id: 'user-1',
      password_changed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    redis.get
      .mockResolvedValueOnce(null)       // JTI: not revoked
      .mockResolvedValueOnce(null);      // password_changed cache: miss

    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('calls next() when password_changed Redis check throws (fail-open)', async () => {
    authRepository.findActiveUserById.mockResolvedValueOnce({
      id: 'user-1',
      password_changed_at: null,
    });
    redis.get
      .mockResolvedValueOnce(null)                        // JTI: not revoked
      .mockRejectedValueOnce(new Error('redis down'));    // password_changed: error

    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });
});
