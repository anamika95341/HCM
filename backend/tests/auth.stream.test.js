describe('publishAuthEvent', () => {
  let redis;
  let publishAuthEvent;
  let logger;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../utils/logger', () => ({ warn: jest.fn() }));
    redis = { xadd: jest.fn() };
    publishAuthEvent = require('../utils/authStream').publishAuthEvent;
    logger = require('../utils/logger');
  });

  test('calls xadd with correct stream key and fields', async () => {
    redis.xadd.mockResolvedValue('1234-0');

    await publishAuthEvent(redis, {
      event: 'login_success',
      role: 'citizen',
      userId: 'user-1',
      ip: '127.0.0.1',
      reason: '',
    });

    expect(redis.xadd).toHaveBeenCalledWith(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', 'login_success',
      'role', 'citizen',
      'userId', 'user-1',
      'ip', '127.0.0.1',
      'reason', '',
      'ts', expect.any(String),
    );
  });

  test('does not throw when Redis xadd fails', async () => {
    redis.xadd.mockRejectedValue(new Error('redis down'));

    await expect(
      publishAuthEvent(redis, { event: 'login_failure', role: 'citizen', userId: 'user-1', ip: '1.2.3.4' }),
    ).resolves.toBeUndefined();
  });

  test('logs a warning when Redis xadd fails', async () => {
    redis.xadd.mockRejectedValue(new Error('connection refused'));

    await publishAuthEvent(redis, { event: 'logout', role: 'admin', userId: 'admin-1', ip: '1.2.3.4' });

    expect(logger.warn).toHaveBeenCalledWith(
      'authStream: failed to publish auth event',
      expect.objectContaining({ event: 'logout' }),
    );
  });

  test('handles missing optional fields gracefully', async () => {
    redis.xadd.mockResolvedValue('1234-0');

    await expect(
      publishAuthEvent(redis, { event: 'otp_generated', role: 'citizen', userId: 'user-2' }),
    ).resolves.toBeUndefined();

    expect(redis.xadd).toHaveBeenCalledWith(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', 'otp_generated',
      'role', 'citizen',
      'userId', 'user-2',
      'ip', '',
      'reason', '',
      'ts', expect.any(String),
    );
  });
});
