describe('publishAuthEvent', () => {
  let redis;
  let publishAuthEvent;
  let logger;
  let validateAuthEvent;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../utils/logger', () => ({ warn: jest.fn() }));
    redis = { xadd: jest.fn() };
    ({ publishAuthEvent, validateAuthEvent } = require('../utils/authStream'));
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
      'auth',
      'MAXLEN', '~', '50000',
      '*',
      'version', 'v1',
      'event', 'login_success',
      'userId', 'user-1',
      'role', 'citizen',
      'ip', expect.stringMatching(/^sha256:/),
      'reason', '',
      'requestId', '',
      'ts', expect.any(String),
    );
  });

  test('does not throw when Redis xadd fails', async () => {
    redis.xadd.mockRejectedValue(new Error('redis down'));

    await expect(
      publishAuthEvent(redis, { event: 'login_failure', role: 'citizen', userId: 'user-1', ip: '1.2.3.4' }),
    ).resolves.toBeNull();
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
      publishAuthEvent(redis, { event: 'otp_generated', role: 'citizen', userId: 'user-2', ip: '127.0.0.1' }),
    ).resolves.toBe('1234-0');

    expect(redis.xadd).toHaveBeenCalledWith(
      'auth',
      'MAXLEN', '~', '50000',
      '*',
      'version', 'v1',
      'event', 'otp_generated',
      'userId', 'user-2',
      'role', 'citizen',
      'ip', expect.stringMatching(/^sha256:/),
      'reason', '',
      'requestId', '',
      'ts', expect.any(String),
    );
  });

  test('rejects invalid events before publish', async () => {
    const result = await publishAuthEvent(redis, {
      event: '',
      role: 'citizen',
      userId: 'user-2',
      ip: '127.0.0.1',
    });

    expect(result).toBeNull();
    expect(redis.xadd).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'authStream: rejected invalid auth event',
      expect.objectContaining({
        errors: expect.objectContaining({ event: false }),
      }),
    );
  });

  test('validates strict event contract', () => {
    const validation = validateAuthEvent({
      event: 'token_revoked',
      role: 'citizen',
      userId: 'user-1',
      ip: '127.0.0.1',
      ts: Date.now(),
    });

    expect(validation.valid).toBe(true);
    expect(validation.event.version).toBe('v1');
  });
});
