const meetingsService = require('./meetings.service');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function submitMeetingRequest(req, res, next) {
  try {
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

module.exports = {
  submitMeetingRequest,
  getCitizenMeetings,
  getCitizenMeetingDetail,
  acceptMeeting,
  rejectMeeting,
  assignVerification,
  submitVerification,
  scheduleMeeting,
};
