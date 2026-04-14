const authService = require('./auth.service');
const env = require('../../config/env');

function reqMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.get('x-request-id'),
  };
}

function setAuthCookies(res, { accessToken, refreshToken, csrfToken }) {
  const secure = env.cookieSecure;
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
  // Non-httpOnly so Axios can read it and send as X-XSRF-TOKEN header (double-submit CSRF defense)
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookies(res) {
  const secure = env.cookieSecure;
  const base = { httpOnly: true, secure, sameSite: 'strict' };
  res.clearCookie('access_token', { ...base, path: '/' });
  res.clearCookie('refresh_token', { ...base, path: '/api/v1/auth' });
  res.clearCookie('XSRF-TOKEN', { httpOnly: false, secure, sameSite: 'strict', path: '/' });
}

async function citizenRegister(req, res, next) {
  try {
    const citizen = await authService.registerCitizen(req.body, reqMeta(req));
    res.status(201).json({ citizen });
  } catch (error) {
    next(error);
  }
}

async function citizenVerify(req, res, next) {
  try {
    const result = await authService.verifyCitizenRegistration({
      userId: req.body.userId,
      otp: req.body.otp,
      ip: req.ip,
    }, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deoVerify(req, res, next) {
  try {
    const result = await authService.verifyDeoRegistration(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function adminVerify(req, res, next) {
  try {
    const result = await authService.verifyAdminRegistration(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function adminResendVerification(req, res, next) {
  try {
    const result = await authService.resendAdminVerificationCode(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deoResendVerification(req, res, next) {
  try {
    const result = await authService.resendDeoVerificationCode(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function citizenLogin(req, res, next) {
  try {
    const session = await authService.loginCitizen(req.body, reqMeta(req));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const session = await authService.loginOperator('admin', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

async function masteradminLogin(req, res, next) {
  try {
    const session = await authService.loginOperator('masteradmin', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

async function deoLogin(req, res, next) {
  try {
    const session = await authService.loginOperator('deo', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

async function ministerLogin(req, res, next) {
  try {
    const session = await authService.loginOperator('minister', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

async function forgotCitizenPassword(req, res, next) {
  try {
    const result = await authService.forgotCitizenPassword(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function resetCitizenPassword(req, res, next) {
  try {
    const result = await authService.resetCitizenPassword(req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getSession(req, res, next) {
  try {
    const result = await authService.getSessionUser(req.authRole, req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = await authService.refreshSession(refreshToken, req.get('user-agent'));
    setAuthCookies(res, session);
    return res.json({ user: session.user });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.user.role, req.token, req.cookies?.refresh_token, reqMeta(req));
    clearAuthCookies(res);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSession,
  citizenRegister,
  citizenVerify,
  adminVerify,
  deoVerify,
  adminResendVerification,
  deoResendVerification,
  citizenLogin,
  adminLogin,
  masteradminLogin,
  deoLogin,
  ministerLogin,
  forgotCitizenPassword,
  resetCitizenPassword,
  refresh,
  logout,
};
