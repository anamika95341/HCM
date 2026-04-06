const settingsService = require('./settings.service');

function reqMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
}

async function getProfile(req, res, next) {
  try {
    const profile = await settingsService.getProfile(req.authRole, req.user.sub);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await settingsService.updateProfile(req.authRole, req.user.sub, req.body || {}, reqMeta(req));
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await settingsService.changePassword(req.authRole, req.user.sub, req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
