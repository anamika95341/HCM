const deoService = require('./deo.service');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function getAssignedMeetings(req, res, next) {
  try {
    const meetings = await deoService.getAssignedMeetings(req.user.sub);
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
}

async function getCompletedMeetings(req, res, next) {
  try {
    const meetings = await deoService.getCompletedMeetings(req.user.sub);
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
}

async function listMinisters(req, res, next) {
  try {
    const ministers = await deoService.listMinisters();
    res.json({ ministers });
  } catch (error) {
    next(error);
  }
}

async function createCalendarEvent(req, res, next) {
  try {
    const event = await deoService.createCalendarEvent(req.user.sub, req.body, reqMeta(req));
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

async function getCalendarEvents(req, res, next) {
  try {
    const events = await deoService.getCalendarEvents(req.user.sub);
    res.json({ events });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAssignedMeetings, getCompletedMeetings, listMinisters, createCalendarEvent, getCalendarEvents };
