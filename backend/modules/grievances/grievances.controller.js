const grievancesService = require('./grievances.service');
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

async function submitGrievance(req, res, next) {
  try {
    logger.info('Grievance submission request received', {
      citizenId: req.user?.sub || null,
      hasFile: Boolean(req.file),
      hasIdempotencyKey: Boolean(req.get('Idempotency-Key')),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    const result = await grievancesService.submitGrievance({
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

async function getCitizenGrievances(req, res, next) {
  try {
    const grievances = await grievancesService.getCitizenGrievances(req.user.sub);
    res.json({ grievances });
  } catch (error) {
    next(error);
  }
}

async function getCitizenGrievanceDetail(req, res, next) {
  try {
    const detail = await grievancesService.getCitizenGrievanceDetail(req.params.grievanceId, req.user.sub, reqMeta(req));
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function getAdminGrievanceDetail(req, res, next) {
  try {
    const detail = await grievancesService.getAdminGrievanceDetail(
      req.params.grievanceId,
      req.user.sub,
      reqMeta(req),
      req.user?.adminType || 'regular',
    );
    res.json(detail);
  } catch (error) {
    next(error);
  }
}

async function assignGrievanceToSelf(req, res, next) {
  try {
    const grievance = await grievancesService.assignGrievanceToSelf(req.params.grievanceId, req.user.sub, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function startGrievanceReview(req, res, next) {
  try {
    const grievance = await grievancesService.startGrievanceReview(req.params.grievanceId, req.user.sub, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function updateGrievanceDepartment(req, res, next) {
  try {
    const grievance = await grievancesService.updateGrievanceDepartment(req.params.grievanceId, req.user.sub, req.body, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function scheduleGrievanceCall(req, res, next) {
  try {
    const grievance = await grievancesService.scheduleGrievanceCall(req.params.grievanceId, req.user.sub, req.body.callScheduledAt, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function logGrievanceAction(req, res, next) {
  try {
    const grievance = await grievancesService.logGrievanceAction(req.params.grievanceId, req.user.sub, req.body, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function resolveGrievance(req, res, next) {
  try {
    const grievance = await grievancesService.resolveGrievance(req.params.grievanceId, req.user.sub, req.body, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function reopenGrievance(req, res, next) {
  try {
    const grievance = await grievancesService.reopenGrievance(req.params.grievanceId, req.user.sub, req.body.reason, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function closeGrievance(req, res, next) {
  try {
    const grievance = await grievancesService.closeGrievance(req.params.grievanceId, req.user.sub, req.body.note, reqMeta(req));
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

async function getCmAdminGrievances(req, res, next) {
  try {
    const grievances = await grievancesService.getCmAdminGrievances();
    res.json({ grievances });
  } catch (error) {
    next(error);
  }
}

async function generateDeoLetterhead(req, res, next) {
  try {
    const grievance = await grievancesService.generateDeoLetterhead(
      req.params.grievanceId,
      req.user.sub,
      req.body.office,
      req.files || [],
      reqMeta(req)
    );
    res.json({ grievance });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitGrievance,
  getCitizenGrievances,
  getCitizenGrievanceDetail,
  getAdminGrievanceDetail,
  getCmAdminGrievances,
  generateDeoLetterhead,
  assignGrievanceToSelf,
  startGrievanceReview,
  updateGrievanceDepartment,
  scheduleGrievanceCall,
  logGrievanceAction,
  resolveGrievance,
  reopenGrievance,
  closeGrievance,
};
