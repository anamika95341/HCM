const masteradminService = require('./masteradmin.service');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function getDashboard(req, res, next) {
  try {
    res.json(await masteradminService.getDashboard());
  } catch (error) {
    next(error);
  }
}

async function listAdmins(req, res, next) {
  try {
    res.json(await masteradminService.listAdmins());
  } catch (error) {
    next(error);
  }
}

async function createAdmin(req, res, next) {
  try {
    res.status(201).json(await masteradminService.createAdmin(req.user.sub, req.body, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

async function removeAdmin(req, res, next) {
  try {
    res.json(await masteradminService.removeAdmin(req.user.sub, req.params.adminId, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

async function listDeos(req, res, next) {
  try {
    res.json(await masteradminService.listDeos());
  } catch (error) {
    next(error);
  }
}

async function createDeo(req, res, next) {
  try {
    res.status(201).json(await masteradminService.createDeo(req.user.sub, req.body, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

async function removeDeo(req, res, next) {
  try {
    res.json(await masteradminService.removeDeo(req.user.sub, req.params.deoId, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAdmin,
  createDeo,
  getDashboard,
  listAdmins,
  listDeos,
  removeAdmin,
  removeDeo,
};
