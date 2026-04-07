jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../config/jwt', () => ({
  getRoleConfig: jest.fn((role) => ({
    privateKey: `priv-${role}`,
    publicKey: `pub-${role}`,
    issuer: 'hcm',
    audience: role,
    accessTokenTtl: '15m',
    refreshTokenTtlDays: 30,
  })),
}));

jest.mock('../modules/auth/auth.repository', () => ({
  findCitizenByCitizenId: jest.fn(),
  storeRefreshToken: jest.fn(),
  updatePassword: jest.fn(),
  findActiveRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  findActiveUserById: jest.fn(),
}));

jest.mock('../utils/mailer', () => ({ sendMail: jest.fn() }));
jest.mock('../utils/smsService', () => ({ sendSms: jest.fn() }));
jest.mock('../utils/otpService', () => ({ generateOtp: jest.fn(), verifyOtp: jest.fn() }));
jest.mock('../utils/captchaVerify', () => ({ verifyCaptcha: jest.fn() }));
jest.mock('../utils/audit', () => ({ writeAuditLog: jest.fn() }));
jest.mock('../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }));
jest.mock('../utils/authStream', () => ({ publishAuthEvent: jest.fn().mockResolvedValue('1000-0') }));
jest.mock('../modules/citizen/citizen.repository', () => ({}));
jest.mock('../utils/mpLookup', () => ({ lookupMp: jest.fn() }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const authRepository = require('../modules/auth/auth.repository');
const { verifyOtp } = require('../utils/otpService');
const { publishAuthEvent } = require('../utils/authStream');
const authService = require('../modules/auth/auth.service');

describe('auth service resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign.mockReturnValue('signed-token');
    jwt.verify.mockImplementation((token) => {
      if (token === 'signed-token') {
        return { sub: 'user-1', jti: 'refresh-new', exp: Math.floor(Date.now() / 1000) + 3600, type: 'refresh', role: 'citizen' };
      }
      if (token === 'refresh-token') {
        return { sub: 'user-1', jti: 'refresh-old', exp: Math.floor(Date.now() / 1000) + 3600, type: 'refresh', role: 'citizen' };
      }
      return { sub: 'user-1', jti: 'access-jti', exp: Math.floor(Date.now() / 1000) + 3600, role: 'citizen' };
    });
    jwt.decode.mockReturnValue({ role: 'citizen' });
  });

  test('loginCitizen succeeds when Redis-backed lockout checks fail', async () => {
    authRepository.findCitizenByCitizenId.mockResolvedValue({
      id: 'user-1',
      citizen_id: 'CTZ-1',
      password_hash: 'hash',
      is_verified: true,
      email: 'citizen@example.gov.in',
    });
    authRepository.storeRefreshToken.mockResolvedValue({ id: 'rt-1' });
    bcrypt.compare.mockResolvedValue(true);
    redis.get.mockRejectedValue(new Error('redis down'));
    redis.del.mockRejectedValue(new Error('redis down'));

    const result = await authService.loginCitizen(
      { citizenId: 'CTZ-1', password: 'StrongPass123!' },
      { ip: '127.0.0.1', userAgent: 'jest' }
    );

    expect(result).toEqual(expect.objectContaining({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
    }));
    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'login_success', role: 'citizen', userId: 'user-1' }),
    );
  });

  test('logout succeeds when Redis token blacklist write fails', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));
    authRepository.findActiveRefreshToken.mockResolvedValue({ id: 'refresh-row-1' });
    authRepository.revokeRefreshToken.mockResolvedValue(undefined);

    const result = await authService.logout('citizen', 'access-token', 'refresh-token');

    expect(result).toEqual({ message: 'Logged out successfully' });
    expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith('refresh-row-1');
    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'token_revoked', userId: 'user-1' }),
    );
    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'logout', userId: 'user-1' }),
    );
  });

  test('resetCitizenPassword succeeds when Redis password marker write fails', async () => {
    authRepository.findCitizenByCitizenId.mockResolvedValue({ id: 'user-1', citizen_id: 'CTZ-1' });
    verifyOtp.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new-hash');
    redis.set.mockRejectedValue(new Error('redis down'));

    const result = await authService.resetCitizenPassword(
      { citizenId: 'CTZ-1', otp: '123456', password: 'StrongPass123!' },
      { ip: '127.0.0.1', userAgent: 'jest' }
    );

    expect(authRepository.updatePassword).toHaveBeenCalledWith('citizen', 'user-1', 'new-hash');
    expect(result).toEqual({ message: 'Password reset completed if the account exists.' });
    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'password_reset', userId: 'user-1' }),
    );
  });

  test('loginCitizen publishes failure when user is missing', async () => {
    authRepository.findCitizenByCitizenId.mockResolvedValue(null);

    await expect(
      authService.loginCitizen(
        { citizenId: 'CTZ-404', password: 'WrongPass123!' },
        { ip: '127.0.0.1', userAgent: 'jest', requestId: 'req-404' }
      )
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event: 'login_failure',
        role: 'citizen',
        userId: 'unknown',
        reason: 'user_not_found',
        requestId: 'req-404',
      }),
    );
  });

  test('refreshSession verifies only the decoded role path', async () => {
    authRepository.findActiveRefreshToken
      .mockResolvedValueOnce({ id: 'stored-old', token_hash: require('../utils/crypto').sha256('refresh-token') })
      .mockResolvedValueOnce({ id: 'stored-new' });
    authRepository.findActiveUserById.mockResolvedValue({ id: 'user-1', citizen_id: 'CTZ-1' });
    authRepository.storeRefreshToken.mockResolvedValue({ id: 'stored-new' });
    authRepository.revokeRefreshToken.mockResolvedValue(undefined);

    await authService.refreshSession('refresh-token');

    expect(jwt.decode).toHaveBeenCalledWith('refresh-token');
    expect(jwt.verify).toHaveBeenCalledTimes(3);
    expect(jwt.verify).toHaveBeenNthCalledWith(
      1,
      'refresh-token',
      'pub-citizen',
      expect.objectContaining({ audience: 'citizen' })
    );
    expect(jwt.verify).not.toHaveBeenCalledWith(
      'refresh-token',
      'pub-admin',
      expect.anything()
    );
  });

  test('refreshSession returns unauthorized for invalid refresh token signature', async () => {
    jwt.verify.mockImplementation(() => {
      const error = new Error('invalid signature');
      error.name = 'JsonWebTokenError';
      throw error;
    });

    await expect(authService.refreshSession('refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});
