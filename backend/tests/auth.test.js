const { getRoleConfig } = require('../config/jwt');

describe('jwt role config', () => {
  test('returns a dedicated audience for masteradmin tokens', () => {
    const config = getRoleConfig('masteradmin');
    expect(config.audience).toBe('masteradmin');
  });
});
