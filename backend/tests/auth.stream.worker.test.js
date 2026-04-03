jest.mock('../config/redis', () => ({
  duplicate: jest.fn(() => ({ quit: jest.fn().mockResolvedValue('OK') })),
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { createAuthStreamWorker } = require('../workers/authStreamWorker');

function makeRedisMocks() {
  return {
    xgroup: jest.fn().mockResolvedValue('OK'),
    xreadgroup: jest.fn().mockResolvedValue([]),
    xack: jest.fn().mockResolvedValue(1),
    xadd: jest.fn().mockResolvedValue('2000-0'),
    xpending: jest.fn().mockResolvedValue([]),
    xclaim: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn(() => ({
      hincrby: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  };
}

function message(id, fields) {
  return [['auth', [[id, fields]]]];
}

function fieldsToObject(xaddArgs) {
  const result = {};
  for (let index = 5; index < xaddArgs.length; index += 2) {
    result[xaddArgs[index]] = xaddArgs[index + 1];
  }
  return result;
}

describe('authStreamWorker', () => {
  test('processes and acknowledges a fresh event', async () => {
    const redis = makeRedisMocks();
    const reader = { ...redis, quit: jest.fn().mockResolvedValue('OK') };
    const processor = jest.fn().mockResolvedValue(undefined);
    redis.xreadgroup.mockResolvedValue(message('1000-0', [
      'version', 'v1',
      'event', 'login_success',
      'userId', 'user-1',
      'role', 'citizen',
      'ip', 'sha256:abc123',
      'reason', '',
      'requestId', 'req-1',
      'ts', String(Date.now()),
    ]));

    const worker = createAuthStreamWorker({
      redisClient: redis,
      readerClient: reader,
      processor,
      pollIntervalMs: 0,
    });

    const processed = await worker.pollOnce();

    expect(processed).toBe(1);
    expect(processor).toHaveBeenCalledWith(expect.objectContaining({
      originalEventId: '1000-0',
      retryCount: 0,
    }));
    expect(redis.set).toHaveBeenCalledWith(
      'processed:1000-0',
      expect.any(String),
      'EX',
      86400,
      'NX',
    );
    expect(redis.xack).toHaveBeenCalledWith('auth', 'auth-monitor', '1000-0');
  });

  test('requeues failed events with incremented retry count', async () => {
    const redis = makeRedisMocks();
    const reader = { ...redis, quit: jest.fn().mockResolvedValue('OK') };
    const processor = jest.fn().mockRejectedValue(new Error('downstream failed'));
    redis.xreadgroup.mockResolvedValue(message('1000-0', [
      'version', 'v1',
      'event', 'login_failure',
      'userId', 'user-1',
      'role', 'citizen',
      'ip', 'sha256:abc123',
      'reason', 'invalid_credentials',
      'requestId', 'req-1',
      'ts', String(Date.now()),
      'retryCount', '0',
    ]));

    const worker = createAuthStreamWorker({
      redisClient: redis,
      readerClient: reader,
      processor,
      pollIntervalMs: 0,
      sleepFn: jest.fn().mockResolvedValue(undefined),
    });

    await worker.pollOnce();

    const xaddArgs = redis.xadd.mock.calls[0];
    const fields = fieldsToObject(xaddArgs);
    expect(xaddArgs.slice(0, 5)).toEqual(['auth', 'MAXLEN', '~', '50000', '*']);
    expect(fields.retryCount).toBe('1');
    expect(fields.originalEventId).toBe('1000-0');
    expect(Number(fields.availableAt)).toBeGreaterThan(0);
    expect(redis.xack).toHaveBeenCalledWith('auth', 'auth-monitor', '1000-0');
  });

  test('pushes to DLQ after max retries', async () => {
    const redis = makeRedisMocks();
    const reader = { ...redis, quit: jest.fn().mockResolvedValue('OK') };
    const processor = jest.fn().mockRejectedValue(new Error('still failing'));
    redis.xreadgroup.mockResolvedValue(message('1000-0', [
      'version', 'v1',
      'event', 'token_revoked',
      'userId', 'user-1',
      'role', 'citizen',
      'ip', 'sha256:abc123',
      'reason', 'access_token',
      'requestId', 'req-1',
      'ts', String(Date.now()),
      'retryCount', '5',
    ]));

    const worker = createAuthStreamWorker({
      redisClient: redis,
      readerClient: reader,
      processor,
      pollIntervalMs: 0,
      maxRetries: 5,
    });

    await worker.pollOnce();

    const xaddArgs = redis.xadd.mock.calls[0];
    const fields = fieldsToObject(xaddArgs);
    expect(xaddArgs.slice(0, 5)).toEqual(['auth:events', 'MAXLEN', '~', '50000', '*']);
    expect(fields.originalEventId).toBe('1000-0');
    expect(fields.retryCount).toBe('6');
    expect(fields.errorMessage).toBe('still failing');
    expect(Number(fields.failedAt)).toBeGreaterThan(0);
    expect(redis.xack).toHaveBeenCalledWith('auth', 'auth-monitor', '1000-0');
  });

  test('skips duplicate events using processed key', async () => {
    const redis = makeRedisMocks();
    const reader = { ...redis, quit: jest.fn().mockResolvedValue('OK') };
    const processor = jest.fn().mockResolvedValue(undefined);
    redis.get.mockResolvedValueOnce('done');
    redis.xreadgroup.mockResolvedValue(message('1000-0', [
      'version', 'v1',
      'event', 'logout',
      'userId', 'user-1',
      'role', 'citizen',
      'ip', 'sha256:abc123',
      'reason', '',
      'requestId', 'req-1',
      'ts', String(Date.now()),
    ]));

    const worker = createAuthStreamWorker({
      redisClient: redis,
      readerClient: reader,
      processor,
      pollIntervalMs: 0,
    });

    await worker.pollOnce();

    expect(processor).not.toHaveBeenCalled();
    expect(redis.xack).toHaveBeenCalledWith('auth', 'auth-monitor', '1000-0');
  });
});
