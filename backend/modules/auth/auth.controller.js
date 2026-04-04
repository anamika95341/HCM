const authService = require('./auth.service');

function reqMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.get('x-request-id'),
  };
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
    res.json(session);
  } catch (error) {
    next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const result = await authService.loginOperator('admin', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function masteradminLogin(req, res, next) {
  try {
    const result = await authService.loginOperator('masteradmin', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deoLogin(req, res, next) {
  try {
    const result = await authService.loginOperator('deo', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function ministerLogin(req, res, next) {
  try {
    const result = await authService.loginOperator('minister', req.body.usernameOrEmail, req.body.password, reqMeta(req));
    res.json(result);
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
    const result = await authService.logout(req.user.role, req.token, req.body.refreshToken, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
