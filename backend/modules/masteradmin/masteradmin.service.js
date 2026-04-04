const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const { encryptAadhaar, sha256 } = require('../../utils/crypto');
const { writeAuditLog } = require('../../utils/audit');
const { sendMail } = require('../../utils/mailer');
const { generateOtp } = require('../../utils/otpService');
const redis = require('../../config/redis');
const authRepository = require('../auth/auth.repository');
const adminRepository = require('../admin/admin.repository');
const masteradminRepository = require('./masteradmin.repository');

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

  await sendMail({
    to: email,
    subject: `Your ${role === 'admin' ? 'admin' : 'DEO'} verification code`,
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
  });
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
    await sendVerificationCode({ role: 'admin', userId: admin.id, email: payload.email });
  } catch (error) {
    await masteradminRepository.deletePendingAdminById(admin.id);
    throw createHttpError(502, 'Unable to send admin verification code');
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
    await sendVerificationCode({ role: 'deo', userId: deo.id, email: payload.email });
  } catch (error) {
    await adminRepository.purgePendingDeoById(deo.id);
    throw createHttpError(502, 'Unable to send DEO verification code');
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
