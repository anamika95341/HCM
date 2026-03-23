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

async function getAdminDirectory(req, res, next) {
  try {
    const admins = await citizenService.getAdminDirectory();
    res.json({ admins });
  } catch (error) {
    next(error);
  }
}

async function getMyCases(req, res, next) {
  try {
    const data = await citizenService.getMyCases(req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getCaseDetail(req, res, next) {
  try {
    const detail = await citizenService.getCaseDetail(req.user.sub, req.params.caseId);
    if (!detail) {
      return res.status(404).json({ error: 'Case not found' });
    }
    return res.json(detail);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProfile, getDashboard, getAdminDirectory, getMyCases, getCaseDetail };
