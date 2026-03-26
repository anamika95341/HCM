const ministerService = require('./minister.service');

async function getCalendar(req, res, next) {
  try {
    const events = await ministerService.getCalendar(req.user.sub);
    res.json({ events });
  } catch (error) {
    next(error);
  }
}

async function getMeetingFiles(req, res, next) {
  try {
    const result = await ministerService.getMeetingFiles(req.user.sub, req.params.meetingId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getCalendar, getMeetingFiles };
