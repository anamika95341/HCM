const citizenRepository = require('./citizen.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const adminRepository = require('../admin/admin.repository');

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
  const [meetings, complaints] = await Promise.all([
    meetingsRepository.getCitizenMeetings(citizenId),
    complaintsRepository.getCitizenComplaints(citizenId),
  ]);

  return { meetings, complaints };
}

async function getCaseDetail(citizenId, caseId) {
  const [meeting, complaint] = await Promise.all([
    meetingsRepository.getCitizenMeetingById(caseId, citizenId),
    complaintsRepository.getCitizenComplaintById(caseId, citizenId),
  ]);

  if (meeting) {
    const history = await meetingsRepository.getMeetingHistory(caseId);
    return { itemType: 'meeting', caseData: meeting, history };
  }

  if (complaint) {
    const history = await complaintsRepository.getComplaintHistory(caseId);
    return { itemType: 'complaint', caseData: complaint, history };
  }

  return null;
}

module.exports = { getProfile, getDashboard, getAdminDirectory, getMyCases, getCaseDetail };
