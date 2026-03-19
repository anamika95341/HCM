const adminRepository = require('./admin.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const complaintsRepository = require('../complaints/complaints.repository');

async function getDashboard() {
  return adminRepository.getDashboard();
}

async function getWorkQueue() {
  const [meetings, complaints] = await Promise.all([
    meetingsRepository.getMeetingQueue(),
    complaintsRepository.getComplaintQueue(),
  ]);
  return { meetings, complaints };
}

module.exports = { getDashboard, getWorkQueue };
