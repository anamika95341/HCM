const adminRepository = require('./admin.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const authRepository = require('../auth/auth.repository');
const createHttpError = require('http-errors');

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

async function getWorkflowDirectory() {
  return adminRepository.listWorkflowDirectory();
}

async function listDeos() {
  const deos = await adminRepository.listDeosWithCreators();
  return {
    deos: deos.map((deo) => ({
      id: deo.id,
      username: deo.username,
      firstName: deo.first_name,
      middleName: deo.middle_name,
      lastName: deo.last_name,
      age: deo.age,
      sex: deo.sex,
      email: deo.email,
      phoneNumber: deo.phone_number,
      designation: deo.designation,
      status: deo.status,
      isVerified: deo.is_verified,
      createdAt: deo.created_at,
      createdByAdminId: deo.created_by_admin_id,
      createdByName:
        [deo.creator_master_first_name, deo.creator_master_last_name].filter(Boolean).join(' ')
        || deo.creator_master_username
        || [deo.creator_first_name, deo.creator_last_name].filter(Boolean).join(' ')
        || deo.creator_username
        || '',
    })),
  };
}

module.exports = { getDashboard, getWorkQueue, getWorkflowDirectory, listDeos };
