jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const redis = require('../config/redis');
const pool = require('../config/database');
const { generateOtp, verifyOtp } = require('../utils/otpService');

describe('otp service resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('otp-hash');
    bcrypt.compare.mockResolvedValue(true);
  });

  test('generateOtp falls back to database when Redis set fails', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));
    pool.query.mockResolvedValue({ rows: [] });

    const otp = await generateOtp({ role: 'citizen', userId: 'user-1', purpose: 'password_reset', ip: '127.0.0.1' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO otp_records'),
      expect.arrayContaining(['citizen', 'user-1', 'password_reset', '127.0.0.1', 'otp-hash'])
    );
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('verifyOtp falls back to database when Redis get fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'otp-row-1', otp_hash: 'otp-hash', expires_at: new Date(Date.now() + 60_000).toISOString(), consumed_at: null }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const valid = await verifyOtp({ role: 'citizen', userId: 'user-1', purpose: 'password_reset', ip: '127.0.0.1', otp: '123456' });

    expect(valid).toBe(true);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE otp_records'),
      ['otp-row-1']
    );
  });
});
