const adminService = require('./admin.service');

async function getDashboard(req, res, next) {
  try {
    const dashboard = await adminService.getDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

async function getWorkQueue(req, res, next) {
  try {
    const queue = await adminService.getWorkQueue();
    res.json(queue);
  } catch (error) {
    next(error);
  }
}

async function getWorkflowDirectory(req, res, next) {
  try {
    const directory = await adminService.getWorkflowDirectory();
    res.json(directory);
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard, getWorkQueue, getWorkflowDirectory };
