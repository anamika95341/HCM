const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const grievancesRepository = require('./grievances.repository');
const appointmentsRepository = require('../appointments/appointments.repository');
const adminRepository = require('../admin/admin.repository');
const filesService = require('../files/files.service');
const { persistPrivateUpload } = require('../../middleware/uploadHandler');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');
const {
  notifyCitizenGrievanceStatusUpdate,
  notifyAdminPoolGrievanceSubmitted,
  notifyAdminScheduledAppointmentUpcoming,
  notifyAdminScheduledAppointmentCompleted,
  notifyDeoNewGrievance,
  notifyCmAdminNewGrievance,
} = require('../notifications/notifications.service');
const logger = require('../../utils/logger');
const { claimIdempotency, storeIdempotencyResult, clearIdempotency } = require('../../utils/idempotency');

function sanitizeOptional(input) {
  if (!input) return null;
  return sanitizeText(input);
}

function grievanceLogTypeLabel(logType) {
  if (logType === 'phone_call') return 'Phone Call';
  if (logType === 'mail') return 'Mail';
  if (logType === 'letter_summary') return 'Letter';
  if (logType === 'appointment') return 'Appointment';
  return 'Log';
}

async function submitGrievance({ citizenId, body, file, reqMeta, idempotencyKey }) {
  const claim = await claimIdempotency(redis, {
    scope: 'grievance_submission',
    explicitKey: idempotencyKey,
    actorId: citizenId,
    body,
    file,
    payload: body,
  });

  if (claim.existing && !claim.existing.pending) {
    logger.info('Returning cached grievance submission response', {
      citizenId,
      keySource: claim.source,
    });
    return claim.existing;
  }

  try {
    let document = null;
    if (file) {
      const storedFile = await persistPrivateUpload(file, 'documents');
      document = await appointmentsRepository.createUploadedFile(storedFile, {
        entityType: 'grievance_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const createdGrievance = await grievancesRepository.createGrievance({
      citizenId,
      subject: sanitizeText(body.subject),
      description: sanitizeText(body.description),
      state: sanitizeText(body.state),
      district: sanitizeText(body.district),
      incidentDate: body.incidentDate,
      documentFileId: document?.id,
    });
    const grievance = await grievancesRepository.getGrievanceById(createdGrievance.id) || createdGrievance;

    // Auto-assign to CM admin on submission so no manual "Assign to Me" is needed
    const cmAdmin = await adminRepository.findChiefMinisterAdmin();
    if (cmAdmin) {
      await grievancesRepository.updateGrievanceStatus({
        grievanceId: grievance.id,
        status: 'assigned',
        previousStatus: 'submitted',
        actorRole: 'system',
        actorId: null,
        note: 'Auto-assigned to Chief Minister admin',
        patch: { assigned_admin_id: cmAdmin.id },
      });
      grievance.assignedAdminUserId = cmAdmin.id;
      grievance.status = 'assigned';
    }

    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizenId,
      entityType: 'grievance',
      entityId: grievance.id,
      action: 'grievance_submitted',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    // Notify DEO pool to generate letterhead, and CM admin directly
    await Promise.allSettled([
      notifyDeoNewGrievance({
        grievanceId: grievance.id,
        grievanceTitle: grievance.subject || grievance.grievanceId,
        citizenId,
      }),
      notifyCmAdminNewGrievance({
        grievanceId: grievance.id,
        grievanceTitle: grievance.subject || grievance.grievanceId,
        citizenId,
      }),
    ]);

    const result = { grievance };
    await storeIdempotencyResult(redis, claim, result);
    return result;
  } catch (error) {
    await clearIdempotency(redis, claim);
    throw error;
  }
}

async function getCitizenGrievances(citizenId) {
  return grievancesRepository.getCitizenGrievances(citizenId);
}

async function getCitizenGrievanceDetail(grievanceId, citizenId, reqMeta) {
  const grievance = await grievancesRepository.getCitizenGrievanceById(grievanceId, citizenId);
  if (!grievance) {
    throw createHttpError(404, 'Grievance not found');
  }
  const history = await grievancesRepository.getGrievanceHistory(grievanceId);
  const files = [];
  try {
    if (grievance.document_file_id) {
      const document = await filesService.createLegacyDownloadAccess({
        fileId: grievance.document_file_id,
        actorRole: 'citizen',
        actorId: citizenId,
        scope: { entityType: 'grievance', entityId: grievanceId },
      });
      grievance.document = {
        ...document.file,
        downloadUrl: document.downloadUrl,
      };
      files.push({
        ...document.file,
        fileCategory: 'document',
        downloadUrl: document.downloadUrl,
      });
    }
    const managedFiles = await filesService.listOwnedFiles({
      actorRole: 'citizen',
      actorId: citizenId,
      contextType: 'grievance',
      contextId: grievanceId,
      reqMeta,
    });
    grievance.files = [...files, ...managedFiles];
  } catch (_) {
    grievance.files = files;
  }
  return { grievance, history };
}

async function getAdminGrievanceDetail(grievanceId, adminId, reqMeta, adminType = 'regular') {
  const grievance = await grievancesRepository.getGrievanceById(grievanceId);
  if (!grievance) {
    throw createHttpError(404, 'Grievance not found');
  }
  const isChiefMinister = adminType === 'chief_minister';
  const [history, admins] = await Promise.all([
    grievancesRepository.getGrievanceHistory(grievanceId),
    adminRepository.listActiveAdminsForCitizenDirectory(),
  ]);

  const contacts = grievance.department || grievance.officerName || grievance.officerContact || grievance.manualContact
    ? [{
      department: grievance.department || 'General Administration',
      officerName: grievance.officerName || '',
      designation: 'Department Contact',
      phone: grievance.manualContact || grievance.officerContact || '',
    }]
    : [];

  // Grievance files and the DEO letterhead are restricted to the Chief Minister admin.
  const files = [];
  if (isChiefMinister) {
    try {
      if (grievance.document_file_id) {
        const document = await filesService.createLegacyDownloadAccess({
          fileId: grievance.document_file_id,
          actorRole: 'admin',
          actorId: adminId,
          adminType,
          scope: { entityType: 'grievance', entityId: grievanceId },
        });
        grievance.document = {
          ...document.file,
          downloadUrl: document.downloadUrl,
        };
        files.push({
          ...document.file,
          fileCategory: 'document',
          downloadUrl: document.downloadUrl,
        });
      }

      if (grievance.letterheadFileId) {
        try {
          const letterhead = await filesService.createLegacyDownloadAccess({
            fileId: grievance.letterheadFileId,
            actorRole: 'admin',
            actorId: adminId,
            adminType,
            scope: { entityType: 'grievance_letterhead', entityId: grievanceId },
          });
          grievance.letterheadFile = {
            ...letterhead.file,
            downloadUrl: letterhead.downloadUrl,
          };
        } catch (_) {
          // letterhead access not critical
        }
      }

      const managedFiles = await filesService.listFiles({
        actorRole: 'admin',
        actorId: adminId,
        adminType,
        query: {
          contextType: 'grievance',
          contextId: grievanceId,
        },
      });
      const hydratedManagedFiles = await Promise.all(
        managedFiles.files.map(async (file) => {
          const download = await filesService.createDownloadUrl({
            fileId: file.id,
            actorRole: 'admin',
            actorId: adminId,
            adminType,
            reqMeta,
          });
          return {
            ...file,
            downloadUrl: download.downloadUrl,
          };
        })
      );

      // Fetch all DEO-uploaded files (additional documents + letterheads) linked to this grievance
      const alreadyIncluded = new Set([grievance.document_file_id, grievance.letterheadFileId].filter(Boolean));
      const deoLinkedFiles = await appointmentsRepository.listUploadedFilesByEntityId(
        grievanceId,
        ['grievance_document', 'grievance_letterhead']
      );
      const hydratedDeoFiles = [];
      for (const rawFile of deoLinkedFiles) {
        if (alreadyIncluded.has(rawFile.id)) continue;
        try {
          const access = await filesService.createLegacyDownloadAccess({
            fileId: rawFile.id,
            actorRole: 'admin',
            actorId: adminId,
            adminType,
            scope: { entityType: rawFile.entity_type, entityId: grievanceId },
          });
          hydratedDeoFiles.push({
            ...access.file,
            fileCategory: rawFile.entity_type === 'grievance_letterhead' ? 'letterhead' : 'document',
            downloadUrl: access.downloadUrl,
          });
        } catch (_) {
          // non-critical — skip inaccessible files
        }
      }

      grievance.files = [...files, ...hydratedManagedFiles, ...hydratedDeoFiles];
    } catch (_) {
      grievance.files = files;
    }
  } else {
    grievance.files = [];
  }

  return {
    grievance,
    history,
    contacts,
    admins: admins.map((admin) => ({
      id: admin.id,
      name: [admin.first_name, admin.last_name].filter(Boolean).join(' '),
      department: admin.designation,
    })),
  };
}

function assertAllowedGrievanceTransition(currentStatus, allowedStatuses, actionLabel) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw createHttpError(409, `Cannot ${actionLabel} when grievance status is ${currentStatus}`);
  }
}

function assertGrievanceAdminAccess(grievance, adminId, { allowUnassigned = false, actionLabel = 'modify this grievance' } = {}) {
  if (!grievance.assignedAdminUserId) {
    if (allowUnassigned) {
      return;
    }
    throw createHttpError(409, `Cannot ${actionLabel} because the grievance is not assigned`);
  }
  if (grievance.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Only the assigned admin can perform this action');
  }
}

async function applyGrievanceTransition({
  grievanceId,
  actorId,
  actorRole,
  nextStatus,
  note,
  patch = {},
  allowedPreviousStatuses,
  actionLabel,
}) {
  const grievance = await grievancesRepository.getGrievanceById(grievanceId);
  if (!grievance) {
    throw createHttpError(404, 'Grievance not found');
  }
  if (allowedPreviousStatuses?.length) {
    assertAllowedGrievanceTransition(
      grievance.status,
      allowedPreviousStatuses,
      actionLabel || nextStatus,
    );
  }

  await grievancesRepository.updateGrievanceStatus({
    grievanceId,
    status: nextStatus,
    previousStatus: grievance.status,
    actorRole,
    actorId,
    note,
    patch,
  });

  const updated = await grievancesRepository.getGrievanceById(grievanceId);
  await notifyCitizenGrievanceStatusUpdate({
    citizenId: grievance.citizen_id,
    grievanceId,
    status: nextStatus,
    note,
  });
  return updated;
}

async function assignGrievanceToSelf(grievanceId, adminId, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  if (current.assignedAdminUserId && current.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Grievance is already assigned to another admin');
  }

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId: adminId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: ['submitted', 'assigned'],
    actionLabel: 'assign this grievance',
    note: 'Grievance assigned to admin',
    patch: { assigned_admin_id: adminId },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_assigned_to_self',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return grievance;
}

async function startGrievanceReview(grievanceId, actorId, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'start review for this grievance' });

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'in_review',
    allowedPreviousStatuses: ['assigned', 'in_review'],
    actionLabel: 'start review for this grievance',
    note: 'Grievance review started',
    patch: {
      status_reason: 'Grievance review started',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_review_started',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return grievance;
}

async function updateGrievanceDepartment(grievanceId, actorId, body, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'update department handling for this grievance' });

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'department_contact_identified',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'department_contact_identified',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'update department handling for this grievance',
    note: 'Department flow updated',
    patch: {
      department: sanitizeText(body.department),
      officer_name: sanitizeOptional(body.officerName),
      officer_contact: sanitizeOptional(body.officerContact),
      manual_contact: sanitizeOptional(body.manualContact),
      status_reason: 'Department contact identified',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_department_updated',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return grievance;
}

async function scheduleGrievanceCall(grievanceId, actorId, callScheduledAt, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'schedule a call for this grievance' });
  const scheduleAt = new Date(callScheduledAt);
  if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now()) {
    throw createHttpError(400, 'Call date and time must be in the future');
  }

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'call_scheduled',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'schedule a call for this grievance',
    note: 'Follow-up appointment scheduled',
    patch: {
      call_scheduled_at: callScheduledAt,
      status_reason: 'Follow-up appointment scheduled',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_call_scheduled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  await notifyAdminScheduledAppointmentUpcoming({
    adminId: actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    title: grievance.subject || grievance.grievanceId,
    scheduledAt: callScheduledAt,
  });

  return grievance;
}

async function logGrievanceAction(grievanceId, actorId, body, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'log this grievance activity' });
  const summary = sanitizeOptional(body.summary);
  const logTypes = Array.isArray(body.logTypes) ? body.logTypes : [];
  const logLabels = logTypes.map(grievanceLogTypeLabel).join(', ');
  const note = summary
    ? `${logLabels}: ${summary}`
    : `${logLabels} logged`;

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: current.status === 'assigned' ? 'in_review' : current.status,
    allowedPreviousStatuses: ['assigned', 'in_review', 'call_scheduled', 'followup_in_progress'],
    actionLabel: 'log this grievance activity',
    note,
    patch: { call_outcome: note },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_log_added',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { logTypes },
  });

  return grievance;
}

async function resolveGrievance(grievanceId, actorId, body, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'resolve this grievance' });

  const docNames = (body.resolutionDocs || []).map((doc) => sanitizeText(doc.name)).filter(Boolean);
  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'resolved',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'resolve this grievance',
    note: sanitizeText(body.resolutionSummary),
    patch: {
      resolution_summary: sanitizeText(body.resolutionSummary),
      resolution_note: sanitizeText(body.resolutionSummary),
      resolution_document_names: docNames,
      status_reason: 'Grievance resolved',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_resolved',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return grievance;
}

async function reopenGrievance(grievanceId, actorId, reason, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'reopen this grievance' });
  const reopenedCount = (current?.reopenedCount || 0) + 1;
  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: ['resolved', 'completed', 'rejected'],
    actionLabel: 'reopen this grievance',
    note: sanitizeText(reason),
    patch: {
      reopened_count: reopenedCount,
      status_reason: sanitizeText(reason),
      closed_at: null,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_reopened',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (current.callScheduledAt) {
    await notifyAdminScheduledAppointmentCompleted({
      adminId: actorId,
      entityType: 'grievance',
      entityId: grievanceId,
      title: grievance.subject || grievance.grievanceId,
      completedByRole: 'admin',
    });
  }

  return grievance;
}

async function closeGrievance(grievanceId, actorId, note, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }
  assertGrievanceAdminAccess(current, actorId, { actionLabel: 'close this grievance' });

  const grievance = await applyGrievanceTransition({
    grievanceId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'completed',
    allowedPreviousStatuses: ['resolved'],
    actionLabel: 'close this grievance',
    note: sanitizeText(note),
    patch: {
      closed_at: new Date().toISOString(),
      status_reason: sanitizeText(note),
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'grievance_closed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (current.callScheduledAt) {
    await notifyAdminScheduledAppointmentCompleted({
      adminId: actorId,
      entityType: 'grievance',
      entityId: grievanceId,
      title: grievance.subject || grievance.grievanceId,
      completedByRole: 'admin',
    });
  }

  return grievance;
}

async function getCmAdminGrievances() {
  return grievancesRepository.getAllGrievancesForCmAdmin();
}

async function generateDeoLetterhead(grievanceId, deoId, office, files, reqMeta) {
  const current = await grievancesRepository.getGrievanceById(grievanceId);
  if (!current) {
    throw createHttpError(404, 'Grievance not found');
  }

  const sanitizedOffice = sanitizeText(office);
  if (!sanitizedOffice) {
    throw createHttpError(400, 'Office is required');
  }
  if (!files.length) {
    throw createHttpError(400, 'Letterhead file is required');
  }

  // Persist all uploaded letterhead files, link each to the grievance
  let primaryFileId = null;
  for (const [i, file] of files.entries()) {
    const storedFile = await persistPrivateUpload(file, 'documents');
    const uploadedFile = await appointmentsRepository.createUploadedFile(storedFile, {
      entityType: 'grievance_letterhead',
      entityId: grievanceId,
      uploadedByRole: 'deo',
      uploadedById: deoId,
    });
    if (i === 0) primaryFileId = uploadedFile.id;
  }

  await grievancesRepository.updateGrievanceLetterhead({
    grievanceId,
    deoId,
    office: sanitizedOffice,
    fileId: primaryFileId,
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: deoId,
    entityType: 'grievance',
    entityId: grievanceId,
    action: 'deo_letterhead_generated',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { office: sanitizedOffice, fileId: primaryFileId },
  });

  return grievancesRepository.getGrievanceById(grievanceId);
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
