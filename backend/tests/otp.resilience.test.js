jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const redis = require('../config/redis');
const pool = require('../config/database');
const { generateOtp, verifyOtp } = require('../utils/otpService');

describe('otpService Redis resilience', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generateOtp throws 503 when Redis set fails', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));
    pool.query.mockRejectedValue({ code: 'ECONNREFUSED' });

    await expect(
      generateOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1' }),
    ).rejects.toMatchObject({ status: 503, message: 'OTP service temporarily unavailable, please try again shortly' });
  });

  test('verifyOtp throws 503 when Redis get fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query.mockRejectedValue({ code: 'ECONNREFUSED' });

    await expect(
      verifyOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1', otp: '123456' }),
    ).rejects.toMatchObject({ status: 503, message: 'OTP service temporarily unavailable, please try again shortly' });
  });

  test('generateOtp returns the OTP string when Redis succeeds', async () => {
    redis.set.mockResolvedValue('OK');

    const otp = await generateOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1' });

    expect(typeof otp).toBe('string');
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('verifyOtp returns false when key not found', async () => {
    redis.get.mockResolvedValue(null);

    const result = await verifyOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1', otp: '123456' });

    expect(result).toBe(false);
  });
});
