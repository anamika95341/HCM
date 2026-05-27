const ministerService = require('./minister.service');

async function getCalendar(req, res, next) {
  try {
    const events = await ministerService.getCalendar(req.user.sub);
    res.json({ events });
  } catch (error) {
    next(error);
  }
}

async function getAppointmentFiles(req, res, next) {
  try {
    const result = await ministerService.getAppointmentFiles(req.user.sub, req.params.appointmentId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getScheduledGrievances(req, res, next) {
  try {
    const grievances = await ministerService.getScheduledGrievances();
    res.json({ grievances });
  } catch (error) {
    next(error);
  }
}

async function getAppointmentPool(req, res, next) {
  try {
    const result = await ministerService.getAppointmentPool();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getCalendar, getAppointmentFiles, getScheduledGrievances, getAppointmentPool };
