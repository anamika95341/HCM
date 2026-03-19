const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('admin registration token verification', () => {
  test('verifies a valid RS256 admin token', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.ADMIN_RSA_PUBLIC_KEY = publicKey.export({ type: 'pkcs1', format: 'pem' });
    jest.resetModules();
    const { verifyAdminRegistrationToken } = require('../utils/tokenVerify');

    const token = jwt.sign(
      { jti: crypto.randomUUID(), designation: 'Officer' },
      privateKey.export({ type: 'pkcs1', format: 'pem' }),
      {
        algorithm: 'RS256',
        subject: 'admin@example.com',
        expiresIn: '10m',
      }
    );

    const payload = verifyAdminRegistrationToken(token);
    expect(payload.sub).toBe('admin@example.com');
    expect(payload.designation).toBe('Officer');
  });
});
