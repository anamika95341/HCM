const meetingsService = require('./meetings.service');
const logger = require('../../utils/logger');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function submitMeetingRequest(req, res, next) {
  try {
    logger.info('Meeting submission request received', {
      citizenId: req.user?.sub || null,
      hasFile: Boolean(req.file),
      hasIdempotencyKey: Boolean(req.get('Idempotency-Key')),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    const result = await meetingsService.submitMeetingRequest({
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

async function getCitizenMeetings(req, res, next) {
  try {
    const meetings = await meetingsService.getCitizenMeetings(req.user.sub);
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
}

async function getCitizenMeetingDetail(req, res, next) {
  try {
    const detail = await meetingsService.getCitizenMeetingDetail(req.params.meetingId, req.user.sub);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminMeetingDetail(req, res, next) {
  try {
    const detail = await meetingsService.getAdminMeetingDetail(req.params.meetingId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminMeetingFiles(req, res, next) {
  try {
    const result = await meetingsService.getAdminMeetingFiles(req.params.meetingId, req.user.sub, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function assignMeetingToSelf(req, res, next) {
  try {
    const meeting = await meetingsService.assignMeetingToSelf(req.params.meetingId, req.user.sub, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function acceptMeeting(req, res, next) {
  try {
    const meeting = await meetingsService.acceptMeeting(req.params.meetingId, req.user.sub, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function rejectMeeting(req, res, next) {
  try {
    const meeting = await meetingsService.rejectMeeting(req.params.meetingId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function assignVerification(req, res, next) {
  try {
    const meeting = await meetingsService.assignVerification(req.params.meetingId, req.user.sub, req.body.deoId, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function submitVerification(req, res, next) {
  try {
    const meeting = await meetingsService.submitVerification(
      req.params.meetingId,
      req.user.sub,
      req.body.verified,
      req.body.reason,
      req.body.notes,
      reqMeta(req)
    );
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function scheduleMeeting(req, res, next) {
  try {
    const meeting = await meetingsService.scheduleMeeting(req.params.meetingId, req.user.sub, req.body, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function uploadMeetingPhoto(req, res, next) {
  try {
    const result = await meetingsService.uploadMeetingPhoto(req.params.meetingId, req.user.sub, req.file, reqMeta(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function completeMeeting(req, res, next) {
  try {
    const meeting = await meetingsService.completeMeeting(req.params.meetingId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

async function cancelMeeting(req, res, next) {
  try {
    const meeting = await meetingsService.cancelMeeting(req.params.meetingId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitMeetingRequest,
  getCitizenMeetings,
  getCitizenMeetingDetail,
  getAdminMeetingDetail,
  getAdminMeetingFiles,
  assignMeetingToSelf,
  acceptMeeting,
  rejectMeeting,
  assignVerification,
  submitVerification,
  scheduleMeeting,
  uploadMeetingPhoto,
  completeMeeting,
  cancelMeeting,
};
