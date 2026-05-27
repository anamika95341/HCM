const deoService = require('./deo.service');
const env = require('../../config/env');
const { getPublicEndpoint } = require('../../utils/requestPublicEndpoint');

function reqMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    publicEndpoint: getPublicEndpoint(req, env.s3PublicEndpoint),
  };
}

async function getAssignedAppointments(req, res, next) {
  try {
    const appointments = await deoService.getAssignedAppointments(req.user.sub);
    res.json({ appointments });
  } catch (error) {
    next(error);
  }
}

async function getCompletedAppointments(req, res, next) {
  try {
    const appointments = await deoService.getCompletedAppointments(req.user.sub, reqMeta(req));
    res.json({ appointments });
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

async function getGrievancesForDeo(req, res, next) {
  try {
    const grievances = await deoService.getGrievancesForDeo();
    res.json({ grievances });
  } catch (error) {
    next(error);
  }
}

async function getAppointmentDetailForDeo(req, res, next) {
  try {
    const appointment = await deoService.getAppointmentDetailForDeo(req.params.appointmentId, req.user.sub, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function getGrievanceDetailForDeo(req, res, next) {
  try {
    const grievance = await deoService.getGrievanceDetailForDeo(req.params.grievanceId, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function submitGrievanceForCitizen(req, res, next) {
  try {
    const result = await deoService.submitGrievanceForCitizen({
      deoId: req.user.sub,
      body: req.body,
      documentFiles: req.files?.document || [],
      letterheadFiles: req.files?.letterhead || [],
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAssignedAppointments, getAppointmentDetailForDeo, getCompletedAppointments, listMinisters, createCalendarEvent, getCalendarEvents, getGrievancesForDeo, getGrievanceDetailForDeo, submitGrievanceForCitizen };
