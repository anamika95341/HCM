const citizenService = require('./citizen.service');

async function getProfile(req, res, next) {
  try {
    const profile = await citizenService.getProfile(req.user.sub);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const dashboard = await citizenService.getDashboard(req.user.sub);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

module.exports = { getProfile, getDashboard };
