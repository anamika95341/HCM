const complaintsService = require('./complaints.service');
const logger = require('../../utils/logger');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function submitComplaint(req, res, next) {
  try {
    logger.info('Complaint submission request received', {
      citizenId: req.user?.sub || null,
      hasFile: Boolean(req.file),
      hasIdempotencyKey: Boolean(req.get('Idempotency-Key')),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    const result = await complaintsService.submitComplaint({
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

async function getCitizenComplaints(req, res, next) {
  try {
    const complaints = await complaintsService.getCitizenComplaints(req.user.sub);
    res.json({ complaints });
  } catch (error) {
    next(error);
  }
}

async function getCitizenComplaintDetail(req, res, next) {
  try {
    const detail = await complaintsService.getCitizenComplaintDetail(req.params.complaintId, req.user.sub);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminComplaintDetail(req, res, next) {
  try {
    const detail = await complaintsService.getAdminComplaintDetail(req.params.complaintId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function assignComplaintToSelf(req, res, next) {
  try {
    const complaint = await complaintsService.assignComplaintToSelf(req.params.complaintId, req.user.sub, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function reassignComplaint(req, res, next) {
  try {
    const complaint = await complaintsService.reassignComplaint(
      req.params.complaintId,
      req.user.sub,
      req.body.adminId,
      req.body.reason,
      reqMeta(req)
    );
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function startComplaintReview(req, res, next) {
  try {
    const complaint = await complaintsService.startComplaintReview(req.params.complaintId, req.user.sub, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function updateComplaintDepartment(req, res, next) {
  try {
    const complaint = await complaintsService.updateComplaintDepartment(req.params.complaintId, req.user.sub, req.body, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function scheduleComplaintCall(req, res, next) {
  try {
    const complaint = await complaintsService.scheduleComplaintCall(req.params.complaintId, req.user.sub, req.body.callScheduledAt, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function logComplaintAction(req, res, next) {
  try {
    const complaint = await complaintsService.logComplaintAction(req.params.complaintId, req.user.sub, req.body, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function resolveComplaint(req, res, next) {
  try {
    const complaint = await complaintsService.resolveComplaint(req.params.complaintId, req.user.sub, req.body, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function escalateComplaintToMeeting(req, res, next) {
  try {
    const result = await complaintsService.escalateComplaintToMeeting(req.params.complaintId, req.user.sub, req.body, reqMeta(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function reopenComplaint(req, res, next) {
  try {
    const complaint = await complaintsService.reopenComplaint(req.params.complaintId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

async function closeComplaint(req, res, next) {
  try {
    const complaint = await complaintsService.closeComplaint(req.params.complaintId, req.user.sub, req.body.note, reqMeta(req));
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitComplaint,
  getCitizenComplaints,
  getCitizenComplaintDetail,
  getAdminComplaintDetail,
  assignComplaintToSelf,
  reassignComplaint,
  startComplaintReview,
  updateComplaintDepartment,
  scheduleComplaintCall,
  logComplaintAction,
  resolveComplaint,
  escalateComplaintToMeeting,
  reopenComplaint,
  closeComplaint,
};
