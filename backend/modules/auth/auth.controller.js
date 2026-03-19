const authService = require('./auth.service');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
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

async function citizenLogin(req, res, next) {
  try {
    const session = await authService.loginCitizen(req.body, reqMeta(req));
    res.json(session);
  } catch (error) {
    next(error);
  }
}

async function adminVerifyRegistrationToken(req, res, next) {
  try {
    const payload = await authService.verifyAdminRegistrationGate(req.body.registrationToken);
    res.json({ valid: true, token: payload });
  } catch (error) {
    next(error);
  }
}

async function adminRegister(req, res, next) {
  try {
    const admin = await authService.registerAdmin(req.body, reqMeta(req));
    res.status(201).json({ admin });
  } catch (error) {
    next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const result = await authService.startTwoFactorLogin('admin', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deoLogin(req, res, next) {
  try {
    const result = await authService.startTwoFactorLogin('deo', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function ministerLogin(req, res, next) {
  try {
    const result = await authService.startTwoFactorLogin('minister', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const session = await authService.verifyTwoFactorLogin(req.body, reqMeta(req));
    res.json(session);
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

async function refresh(req, res, next) {
  try {
    const session = await authService.refreshSession(req.body.refreshToken);
    res.json(session);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.user.role, req.token, req.body.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  citizenRegister,
  citizenVerify,
  citizenLogin,
  adminVerifyRegistrationToken,
  adminRegister,
  adminLogin,
  deoLogin,
  ministerLogin,
  verifyOtp,
  forgotCitizenPassword,
  resetCitizenPassword,
  refresh,
  logout,
};
