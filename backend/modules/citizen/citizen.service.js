const citizenRepository = require('./citizen.repository');
const grievancesRepository = require('../grievances/grievances.repository');
const appointmentsRepository = require('../appointments/appointments.repository');
const adminRepository = require('../admin/admin.repository');
const filesService = require('../files/files.service');
const logger = require('../../utils/logger');

async function getProfile(citizenId) {
  return citizenRepository.findCitizenById(citizenId);
}

async function getDashboard(citizenId) {
  const [profile, grievances, appointments] = await Promise.all([
    citizenRepository.findCitizenById(citizenId),
    grievancesRepository.getCitizenGrievances(citizenId),
    appointmentsRepository.getCitizenAppointments(citizenId),
  ]);

  return {
    profile,
    grievancesCount: grievances.length,
    appointmentsCount: appointments.length,
    latestGrievance: grievances[0] || null,
    latestAppointment: appointments[0] || null,
  };
}

async function getAdminDirectory() {
  const admins = await adminRepository.listActiveAdminsForCitizenDirectory();
  return admins.map((admin) => ({
    id: admin.id,
    username: admin.username,
    name: [admin.first_name, admin.last_name].filter(Boolean).join(' '),
    department: admin.designation,
  }));
}

async function getMyCases(citizenId) {
  const grievances = await grievancesRepository.getCitizenGrievances(citizenId);
  return { grievances };
}

async function getCaseDetail(citizenId, caseId, reqMeta) {
  const [appointment, grievance] = await Promise.all([
    appointmentsRepository.getCitizenAppointmentById(caseId, citizenId),
    grievancesRepository.getCitizenGrievanceById(caseId, citizenId),
  ]);

  if (appointment) {
    const history = await appointmentsRepository.getAppointmentHistory(caseId);
    const files = [];
    if (appointment.document_file_id) {
      try {
        const document = await filesService.createLegacyDownloadAccess({
          fileId: appointment.document_file_id,
          actorRole: 'citizen',
          actorId: citizenId,
          scope: { entityType: 'appointment', entityId: caseId },
        });
        appointment.document = { ...document.file, downloadUrl: document.downloadUrl };
        files.push({ ...document.file, fileCategory: 'document', downloadUrl: document.downloadUrl });
      } catch (legacyErr) {
        logger.warn('Failed to generate legacy download URL for appointment', { caseId, citizenId, error: legacyErr.message });
      }
    }
    const managedFiles = await filesService.listOwnedFiles({
      actorRole: 'citizen',
      actorId: citizenId,
      contextType: 'appointment',
      contextId: caseId,
      reqMeta,
    });
    appointment.files = [...files, ...managedFiles];
    return { itemType: 'appointment', caseData: appointment, history };
  }

  if (grievance) {
    const history = await grievancesRepository.getGrievanceHistory(caseId);
    const files = [];
    if (grievance.document_file_id) {
      try {
        const document = await filesService.createLegacyDownloadAccess({
          fileId: grievance.document_file_id,
          actorRole: 'citizen',
          actorId: citizenId,
          scope: { entityType: 'grievance', entityId: caseId },
        });
        grievance.document = { ...document.file, downloadUrl: document.downloadUrl };
        files.push({ ...document.file, fileCategory: 'document', downloadUrl: document.downloadUrl });
      } catch (legacyErr) {
        logger.warn('Failed to generate legacy download URL for grievance', { caseId, citizenId, error: legacyErr.message });
      }
    }
    const managedFiles = await filesService.listOwnedFiles({
      actorRole: 'citizen',
      actorId: citizenId,
      contextType: 'grievance',
      contextId: caseId,
      reqMeta,
    });
    grievance.files = [...files, ...managedFiles];
    return { itemType: 'grievance', caseData: grievance, history };
  }

  return null;
}

module.exports = { getProfile, getDashboard, getAdminDirectory, getMyCases, getCaseDetail };
