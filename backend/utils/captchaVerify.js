const axios = require('axios');
const env = require('../config/env');

async function verifyCaptcha(token, ip) {
  if (!env.recaptchaSecret) {
    return env.nodeEnv !== 'production';
  }

  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: env.recaptchaSecret,
        response: token,
        remoteip: ip,
      },
      timeout: 5000,
    }
  );

  return Boolean(response.data?.success);
}

module.exports = { verifyCaptcha };
