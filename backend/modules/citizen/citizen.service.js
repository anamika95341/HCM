const citizenRepository = require('./citizen.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const adminRepository = require('../admin/admin.repository');
const filesService = require('../files/files.service');

async function getProfile(citizenId) {
  return citizenRepository.findCitizenById(citizenId);
}

async function getDashboard(citizenId) {
  const [profile, complaints, meetings] = await Promise.all([
    citizenRepository.findCitizenById(citizenId),
    complaintsRepository.getCitizenComplaints(citizenId),
    meetingsRepository.getCitizenMeetings(citizenId),
  ]);

  return {
    profile,
    complaintsCount: complaints.length,
    meetingsCount: meetings.length,
    latestComplaint: complaints[0] || null,
    latestMeeting: meetings[0] || null,
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
  const complaints = await complaintsRepository.getCitizenComplaints(citizenId);
  return { complaints };
}

async function getCaseDetail(citizenId, caseId, reqMeta) {
  const [meeting, complaint] = await Promise.all([
    meetingsRepository.getCitizenMeetingById(caseId, citizenId),
    complaintsRepository.getCitizenComplaintById(caseId, citizenId),
  ]);

  if (meeting) {
    const history = await meetingsRepository.getMeetingHistory(caseId);
    const files = [];
    try {
      if (meeting.document_file_id) {
        const document = await filesService.createLegacyDownloadAccess({
          fileId: meeting.document_file_id,
          actorRole: 'citizen',
          actorId: citizenId,
          scope: { entityType: 'meeting', entityId: caseId },
        });
        meeting.document = {
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
        contextType: 'meeting',
        contextId: caseId,
        reqMeta,
      });
      meeting.files = [...files, ...managedFiles];
    } catch (_) {
      meeting.files = files;
    }
    return { itemType: 'meeting', caseData: meeting, history };
  }

  if (complaint) {
    const history = await complaintsRepository.getComplaintHistory(caseId);
    const files = [];
    try {
      if (complaint.document_file_id) {
        const document = await filesService.createLegacyDownloadAccess({
          fileId: complaint.document_file_id,
          actorRole: 'citizen',
          actorId: citizenId,
          scope: { entityType: 'complaint', entityId: caseId },
        });
        complaint.document = {
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
        contextType: 'complaint',
        contextId: caseId,
        reqMeta,
      });
      complaint.files = [...files, ...managedFiles];
    } catch (_) {
      complaint.files = files;
    }
    return { itemType: 'complaint', caseData: complaint, history };
  }

  return null;
}

module.exports = { getProfile, getDashboard, getAdminDirectory, getMyCases, getCaseDetail };
