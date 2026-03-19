const citizenRepository = require('./citizen.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');

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

module.exports = { getProfile, getDashboard };
