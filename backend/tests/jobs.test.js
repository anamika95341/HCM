const { buildJobId } = require('../queues/jobs');

describe('job id builder', () => {
  test('builds deterministic BullMQ-safe job ids', () => {
    const jobId = buildJobId('otp-email', 'user:1', 'registration_verification', 123);

    expect(jobId).toBe('otp-email|user%3A1|registration_verification|123');
    expect(jobId).not.toContain(':');
  });

  test('rejects empty parts', () => {
    expect(() => buildJobId('otp-email', '')).toThrow(
      'buildJobId: part at index 0 must not be null, undefined, or empty string'
    );
  });

  test('rejects object parts', () => {
    expect(() => buildJobId('otp-email', { userId: '123' })).toThrow(
      'buildJobId: part at index 0 must be a primitive, not an object'
    );
  });
});
