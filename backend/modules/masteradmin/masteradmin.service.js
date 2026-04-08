const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const { encryptAadhaar, sha256 } = require('../../utils/crypto');
const { writeAuditLog } = require('../../utils/audit');
const { generateOtp } = require('../../utils/otpService');
const { enqueue, JOBS, buildJobId } = require('../../queues/index');
const { getOtpWindowSlot } = require('../../queues/jobs');
const logger = require('../../utils/logger');
const redis = require('../../config/redis');
const authRepository = require('../auth/auth.repository');
const adminRepository = require('../admin/admin.repository');
const masteradminRepository = require('./masteradmin.repository');
const {
  notifyMasterAdminAccountCreated,
} = require('../notifications/notifications.service');

async function sendVerificationCode({ role, userId, email }) {
  const otp = await generateOtp({
    role,
    userId,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: role,
    userId,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: role,
    userId,
    purpose: 'registration_verification',
    channel: 'email',
    destination: email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  // WHY: OTP stored in Redis before enqueue. Email failure is recoverable via resend endpoint.
  enqueue(JOBS.SEND_EMAIL, {
    to: email,
    subject: `Your ${role === 'admin' ? 'admin' : 'DEO'} verification code`,
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
    context: { entityType: role, userId },
  }, {
    jobId: buildJobId('otp-email', userId, 'registration_verification', getOtpWindowSlot()),
  }).catch((err) => logger.warn('Failed to enqueue verification email', { role, userId, error: err.message }));
}

async function getDashboard() {
  return masteradminRepository.getDashboard();
}

async function createAdmin(masterAdminId, payload, reqMeta) {
  const aadhaarHash = sha256(payload.aadhaarNumber);
  const existing = await masteradminRepository.findAdminByIdentityConflict({
    username: payload.username,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    aadhaarHash,
  });

  if (existing) {
    if (existing.username === payload.username) throw createHttpError(409, 'Admin username already exists');
    if (existing.email === payload.email) throw createHttpError(409, 'Admin email already exists');
    if (existing.phone_number === payload.phoneNumber) throw createHttpError(409, 'Admin phone number already exists');
    if (existing.aadhaar_hash === aadhaarHash) throw createHttpError(409, 'Admin Aadhaar already exists');
    throw createHttpError(409, 'Admin account already exists');
  }

  const admin = await adminRepository.createAdmin({
    ...payload,
    aadhaarHash,
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash: await bcrypt.hash(payload.password, 12),
    status: 'pending_verification',
    isVerified: false,
    createdByMasterAdminId: masterAdminId,
  });

  try {
    // WHY: This catch handles OTP generation/Redis failures only — enqueue() inside
    // sendVerificationCode() uses .catch() and never propagates. The rollback here is
    // correct because if OTP infra fails the admin cannot verify and should be cleaned up.
    await sendVerificationCode({ role: 'admin', userId: admin.id, email: payload.email });
  } catch (error) {
    await masteradminRepository.deletePendingAdminById(admin.id);
    throw createHttpError(502, 'Unable to set up admin verification. Please try again.');
  }

  await writeAuditLog({
    actorRole: 'masteradmin',
    actorId: masterAdminId,
    entityType: 'admin',
    entityId: admin.id,
    action: 'admin_created',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { email: payload.email, username: payload.username },
  });

  await notifyMasterAdminAccountCreated({
    accountRole: 'admin',
    accountId: admin.id,
    createdByMasterAdminId: masterAdminId,
    username: admin.username,
    email: payload.email,
  });

  return { admin, verificationMode: 'email_code_sent' };
}

async function createDeo(masterAdminId, payload, reqMeta) {
  const aadhaarHash = sha256(payload.aadhaarNumber);
  const existing = await adminRepository.findDeoByIdentityConflict({
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    aadhaarHash,
  });

  if (existing) {
    if (existing.email === payload.email) throw createHttpError(409, 'DEO email already exists');
    if (existing.phone_number === payload.phoneNumber) throw createHttpError(409, 'DEO phone number already exists');
    if (existing.aadhaar_hash === aadhaarHash) throw createHttpError(409, 'DEO Aadhaar already exists');
    throw createHttpError(409, 'DEO account already exists');
  }

  const deo = await adminRepository.createDeo({
    ...payload,
    aadhaarHash,
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash: await bcrypt.hash(payload.password, 12),
    createdByMasterAdminId: masterAdminId,
  });

  try {
    // WHY: Same as createAdmin — this catch handles OTP infra failures only, not
    // enqueue failures (those are swallowed in sendVerificationCode with .catch()).
    await sendVerificationCode({ role: 'deo', userId: deo.id, email: payload.email });
  } catch (error) {
    await adminRepository.purgePendingDeoById(deo.id);
    throw createHttpError(502, 'Unable to set up DEO verification. Please try again.');
  }

  await writeAuditLog({
    actorRole: 'masteradmin',
    actorId: masterAdminId,
    entityType: 'deo',
    entityId: deo.id,
    action: 'deo_created',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { email: payload.email, username: deo.username },
  });

  await notifyMasterAdminAccountCreated({
    accountRole: 'deo',
    accountId: deo.id,
    createdByMasterAdminId: masterAdminId,
    username: deo.username,
    email: payload.email,
  });

  return { deo, verificationMode: 'email_code_sent' };
}

async function listAdmins() {
  const admins = await masteradminRepository.listAdmins();
  return {
    admins: admins.map((admin) => ({
      id: admin.id,
      username: admin.username,
      firstName: admin.first_name,
      middleName: admin.middle_name,
      lastName: admin.last_name,
      age: admin.age,
      sex: admin.sex,
      designation: admin.designation,
      email: admin.email,
      phoneNumber: admin.phone_number,
      status: admin.status,
      isVerified: admin.is_verified,
      createdAt: admin.created_at,
      createdByName: [admin.creator_first_name, admin.creator_last_name].filter(Boolean).join(' ') || admin.creator_username || '',
    })),
  };
}

async function listDeos() {
  const deos = await masteradminRepository.listDeos();
  return {
    deos: deos.map((deo) => ({
      id: deo.id,
      username: deo.username,
      firstName: deo.first_name,
      middleName: deo.middle_name,
      lastName: deo.last_name,
      age: deo.age,
      sex: deo.sex,
      designation: deo.designation,
      email: deo.email,
      phoneNumber: deo.phone_number,
      status: deo.status,
      isVerified: deo.is_verified,
      createdAt: deo.created_at,
      createdByName: [deo.creator_first_name, deo.creator_last_name].filter(Boolean).join(' ') || deo.creator_username || '',
    })),
  };
}

async function removeAdmin(masterAdminId, adminId, reqMeta) {
  const admin = await masteradminRepository.deactivateAdmin(adminId, masterAdminId);
  if (!admin) {
    throw createHttpError(404, 'Admin not found');
  }

  try {
    await redis.set(`password_changed:admin:${adminId}`, String(Date.now()), 'EX', 86400);
  } catch (err) {
    // Non-fatal: token will expire naturally within 15 minutes
  }
  await authRepository.revokeAllUserRefreshTokens('admin', adminId);

  await writeAuditLog({
    actorRole: 'masteradmin',
    actorId: masterAdminId,
    entityType: 'admin',
    entityId: adminId,
    action: 'admin_removed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Admin removed successfully' };
}

async function removeDeo(masterAdminId, deoId, reqMeta) {
  const deo = await masteradminRepository.deactivateDeo(deoId, masterAdminId);
  if (!deo) {
    throw createHttpError(404, 'DEO not found');
  }

  try {
    await redis.set(`password_changed:deo:${deoId}`, String(Date.now()), 'EX', 86400);
  } catch (err) {
    // Non-fatal: token will expire naturally within 15 minutes
  }
  await authRepository.revokeAllUserRefreshTokens('deo', deoId);

  await writeAuditLog({
    actorRole: 'masteradmin',
    actorId: masterAdminId,
    entityType: 'deo',
    entityId: deoId,
    action: 'deo_removed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'DEO removed successfully' };
}

module.exports = {
  createAdmin,
  createDeo,
  getDashboard,
  listAdmins,
  listDeos,
  removeAdmin,
  removeDeo,
};
