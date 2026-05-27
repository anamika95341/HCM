const appointmentsService = require('./appointments.service');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { getPublicEndpoint } = require('../../utils/requestPublicEndpoint');

function reqMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    publicEndpoint: getPublicEndpoint(req, env.s3PublicEndpoint),
  };
}

async function submitAppointmentRequest(req, res, next) {
  try {
    logger.info('Appointment submission request received', {
      citizenId: req.user?.sub || null,
      hasFile: Boolean(req.file),
      hasIdempotencyKey: Boolean(req.get('Idempotency-Key')),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    const result = await appointmentsService.submitAppointmentRequest({
      citizenId: req.user.sub,
      body: req.body,
      file: req.file,
      reqMeta: reqMeta(req),
      idempotencyKey: req.get('Idempotency-Key'),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getCitizenAppointments(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await appointmentsService.getCitizenAppointments(req.user.sub, { page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getCitizenAppointmentDetail(req, res, next) {
  try {
    const detail = await appointmentsService.getCitizenAppointmentDetail(req.params.appointmentId, req.user.sub, reqMeta(req));
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminAppointmentDetail(req, res, next) {
  try {
    const detail = await appointmentsService.getAdminAppointmentDetail(req.params.appointmentId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminAppointmentFiles(req, res, next) {
  try {
    const result = await appointmentsService.getAdminAppointmentFiles(req.params.appointmentId, req.user.sub, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function assignAppointmentToSelf(req, res, next) {
  try {
    const appointment = await appointmentsService.assignAppointmentToSelf(req.params.appointmentId, req.user.sub, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function acceptAppointment(req, res, next) {
  try {
    const appointment = await appointmentsService.acceptAppointment(req.params.appointmentId, req.user.sub, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function rejectAppointment(req, res, next) {
  try {
    const appointment = await appointmentsService.rejectAppointment(req.params.appointmentId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function assignVerification(req, res, next) {
  try {
    const appointment = await appointmentsService.assignVerification(req.params.appointmentId, req.user.sub, req.body.deoId, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function submitVerification(req, res, next) {
  try {
    const appointment = await appointmentsService.submitVerification(
      req.params.appointmentId,
      req.user.sub,
      req.body.verified,
      req.body.reason,
      req.body.notes,
      reqMeta(req)
    );
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function scheduleAppointment(req, res, next) {
  try {
    const appointment = await appointmentsService.scheduleAppointment(req.params.appointmentId, req.user.sub, req.body, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function uploadAppointmentPhoto(req, res, next) {
  try {
    const result = await appointmentsService.uploadAppointmentPhoto(req.params.appointmentId, req.user.sub, req.file, reqMeta(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function completeAppointment(req, res, next) {
  try {
    const appointment = await appointmentsService.completeAppointment(req.params.appointmentId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const appointment = await appointmentsService.cancelAppointment(req.params.appointmentId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

async function addMeetingLog(req, res, next) {
  try {
    const appointment = await appointmentsService.addMeetingLog(req.params.appointmentId, req.user.sub, req.body.notes, reqMeta(req));
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitAppointmentRequest,
  getCitizenAppointments,
  getCitizenAppointmentDetail,
  getAdminAppointmentDetail,
  getAdminAppointmentFiles,
  assignAppointmentToSelf,
  acceptAppointment,
  rejectAppointment,
  assignVerification,
  submitVerification,
  scheduleAppointment,
  uploadAppointmentPhoto,
  completeAppointment,
  cancelAppointment,
  addMeetingLog,
};
