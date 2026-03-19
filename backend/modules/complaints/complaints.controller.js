const complaintsService = require('./complaints.service');

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function submitComplaint(req, res, next) {
  try {
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

async function updateComplaintStatus(req, res, next) {
  try {
    const complaint = await complaintsService.updateComplaintStatus(
      req.params.complaintId,
      req.user.sub,
      req.body.status,
      req.body.note,
      reqMeta(req)
    );
    res.json({ complaint });
  } catch (error) {
    next(error);
  }
}

module.exports = { submitComplaint, getCitizenComplaints, getCitizenComplaintDetail, updateComplaintStatus };
