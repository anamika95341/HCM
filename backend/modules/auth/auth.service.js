const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const { getRoleConfig } = require('../../config/jwt');
const { encryptAadhaar, sha256 } = require('../../utils/crypto');
const generateCitizenId = require('../../utils/generateCitizenId');
const { sendMail } = require('../../utils/mailer');
const { sendSms } = require('../../utils/smsService');
const { generateOtp, verifyOtp } = require('../../utils/otpService');
const { verifyCaptcha } = require('../../utils/captchaVerify');
const { writeAuditLog } = require('../../utils/audit');
const authRepository = require('./auth.repository');
const citizenRepository = require('../citizen/citizen.repository');
const { lookupMp } = require('../../utils/mpLookup');

function publicUser(user, role) {
  if (role === 'citizen') {
    return {
      id: user.id,
      citizenId: user.citizen_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      state: user.state,
      city: user.city,
      localMp: user.local_mp,
      status: user.status,
      isVerified: user.is_verified,
    };
  }

  if (role === 'masteradmin') {
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      designation: user.designation,
      status: user.status,
    };
  }

  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    designation: user.designation,
    status: user.status,
  };
}

function createAccessToken({ role, userId }) {
  const config = getRoleConfig(role);
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, role, jti },
    config.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: config.accessTokenTtl,
      audience: config.audience,
      issuer: config.issuer,
    }
  );
  return { token, jti };
}

function createRefreshToken({ role, userId }) {
  const config = getRoleConfig(role);
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, role, jti, type: 'refresh' },
    config.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: `${config.refreshTokenTtlDays}d`,
      audience: config.audience,
      issuer: config.issuer,
    }
  );
  return { token, jti };
}

function verifyJwtByRole(role, token) {
  const config = getRoleConfig(role);
  return jwt.verify(token, config.publicKey, {
    algorithms: ['RS256'],
    audience: config.audience,
    issuer: config.issuer,
  });
}

async function issueSession(role, user) {
  const access = createAccessToken({ role, userId: user.id });
  const refresh = createRefreshToken({ role, userId: user.id });
  const refreshPayload = verifyJwtByRole(role, refresh.token);
  await authRepository.storeRefreshToken({
    userRole: role,
    userId: user.id,
    tokenHash: sha256(refresh.token),
    jti: refreshPayload.jti,
    expiresAt: new Date(refreshPayload.exp * 1000),
  });

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    user: publicUser(user, role),
  };
}

async function registerCitizen(payload, reqMeta) {
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const registrationPayload = {
    ...payload,
    aadhaarHash: sha256(payload.aadhaarNumber),
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash,
    localMp: lookupMp({ state: payload.state }),
  };

  const existingCitizen = await citizenRepository.findCitizenByRegistrationConflict({
    email: payload.email,
    aadhaarHash: registrationPayload.aadhaarHash,
    mobileNumber: payload.mobileNumber,
  });

  let citizen;
  let createdNewCitizen = false;
  if (existingCitizen) {
    if (existingCitizen.is_verified || existingCitizen.status === 'active' || existingCitizen.citizen_id) {
      throw createHttpError(409, 'Citizen account already exists. Use login or forgot password.');
    }
    citizen = await citizenRepository.updatePendingCitizen(existingCitizen.id, registrationPayload);
  } else {
    citizen = await citizenRepository.createCitizen(registrationPayload);
    createdNewCitizen = true;
  }

  const destination = payload.preferredVerificationChannel === 'email' ? payload.email : payload.mobileNumber;
  try {
    const otp = await generateOtp({
      role: 'citizen',
      userId: citizen.id,
      purpose: 'registration_verification',
      ip: reqMeta.ip,
    });

    await authRepository.clearVerificationRecords({
      userRole: 'citizen',
      userId: citizen.id,
      purpose: 'registration_verification',
    });

    await authRepository.insertVerificationRecord({
      userRole: 'citizen',
      userId: citizen.id,
      purpose: 'registration_verification',
      channel: payload.preferredVerificationChannel,
      destination,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (payload.preferredVerificationChannel === 'email') {
      await sendMail({
        to: payload.email,
        subject: 'Verify your Citizen Portal account',
        text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      });
    } else {
      await sendSms({
        to: payload.mobileNumber,
        message: `Your OTP is ${otp}. It expires in 5 minutes.`,
      });
    }
  } catch (error) {
    await authRepository.clearVerificationRecords({
      userRole: 'citizen',
      userId: citizen.id,
      purpose: 'registration_verification',
    });
    if (createdNewCitizen) {
      await citizenRepository.deletePendingCitizenById(citizen.id);
    }
    throw createHttpError(502, 'Unable to send citizen verification code');
  }

  await writeAuditLog({
    actorRole: 'citizen',
    actorId: citizen.id,
    entityType: 'citizen',
    entityId: citizen.id,
    action: 'citizen_registered',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return citizen;
}

async function verifyCitizenRegistration({ userId, otp, ip }, reqMeta) {
  const valid = await verifyOtp({
    role: 'citizen',
    userId,
    purpose: 'registration_verification',
    ip,
    otp,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const sequence = Date.now() % 100000000;
  const citizenId = generateCitizenId(sequence);
  await authRepository.updateCitizenVerification(userId, citizenId);
  const user = await authRepository.findUserById('citizen', userId);

  await writeAuditLog({
    actorRole: 'citizen',
    actorId: userId,
    entityType: 'citizen',
    entityId: userId,
    action: 'citizen_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { citizenId, user: publicUser(user, 'citizen') };
}

async function verifyDeoRegistration({ usernameOrEmail, otp }, reqMeta) {
  const user = await authRepository.findDeoByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const validOtp = await verifyOtp({
    role: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
    otp,
  });

  if (!validOtp) {
    await recordLoginFailure({ role: 'deo', userId: user.id, ip: reqMeta.ip });
    throw createHttpError(400, 'Invalid or expired verification code');
  }

  await clearLoginFailures({ role: 'deo', userId: user.id, ip: reqMeta.ip });
  await authRepository.updateDeoVerification(user.id);
  await authRepository.markVerificationRecordVerified({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: user.id,
    entityType: 'deo',
    entityId: user.id,
    action: 'deo_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'DEO account verified successfully. You can now log in.' };
}

async function verifyAdminRegistration({ usernameOrEmail, otp }, reqMeta) {
  const user = await authRepository.findAdminByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const validOtp = await verifyOtp({
    role: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
    otp,
  });

  if (!validOtp) {
    await recordLoginFailure({ role: 'admin', userId: user.id, ip: reqMeta.ip });
    throw createHttpError(400, 'Invalid or expired verification code');
  }

  await clearLoginFailures({ role: 'admin', userId: user.id, ip: reqMeta.ip });
  await authRepository.updateAdminVerification(user.id);
  await authRepository.markVerificationRecordVerified({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: user.id,
    entityType: 'admin',
    entityId: user.id,
    action: 'admin_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Admin account verified successfully. You can now log in.' };
}

async function resendAdminVerificationCode({ usernameOrEmail }, reqMeta) {
  const user = await authRepository.findAdminByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    return { message: 'If that admin account exists, a verification code was sent.' };
  }

  if (user.is_verified) {
    return { message: 'Admin account is already verified.' };
  }

  if (!['pending_verification', 'active'].includes(user.status)) {
    throw createHttpError(403, 'Account not active');
  }

  const otp = await generateOtp({
    role: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    channel: 'email',
    destination: user.email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  await sendMail({
    to: user.email,
    subject: 'Your admin verification code',
    text: `Your admin verification code is ${otp}. It expires in 5 minutes.`,
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: user.id,
    entityType: 'admin',
    entityId: user.id,
    action: 'admin_verification_code_resent',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'If that admin account exists, a verification code was sent.' };
}

async function resendDeoVerificationCode({ usernameOrEmail }, reqMeta) {
  const user = await authRepository.findDeoByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    return { message: 'If that DEO account exists, a verification code was sent.' };
  }

  if (user.is_verified) {
    return { message: 'DEO account is already verified.' };
  }

  if (!['pending_verification', 'active'].includes(user.status)) {
    throw createHttpError(403, 'Account not active');
  }

  const otp = await generateOtp({
    role: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    channel: 'email',
    destination: user.email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  await sendMail({
    to: user.email,
    subject: 'Your DEO verification code',
    text: `Your DEO verification code is ${otp}. It expires in 5 minutes.`,
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: user.id,
    entityType: 'deo',
    entityId: user.id,
    action: 'deo_verification_code_resent',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'If that DEO account exists, a verification code was sent.' };
}

async function checkLockout({ role, userId, ip, email }) {
  const userKey = `login:fail:${role}:${userId}`;
  const ipKey = `login:fail:ip:${role}:${ip}`;
  const [userAttempts, ipAttempts] = await Promise.all([
    redis.get(userKey),
    redis.get(ipKey),
  ]);

  if (Number(userAttempts || 0) >= 10) {
    throw createHttpError(423, 'Account requires manual unlock');
  }
  if (Number(userAttempts || 0) >= 5 || Number(ipAttempts || 0) >= 5) {
    if (email) {
      await sendMail({
        to: email,
        subject: 'Account temporarily locked',
        text: 'Your account has been temporarily locked due to repeated failed login attempts.',
      });
    }
    throw createHttpError(423, 'Account temporarily locked');
  }
}

async function recordLoginFailure({ role, userId, ip }) {
  const userKey = `login:fail:${role}:${userId}`;
  const ipKey = `login:fail:ip:${role}:${ip}`;
  const [userAttempts] = await Promise.all([
    redis.incr(userKey),
    redis.incr(ipKey),
  ]);
  await Promise.all([
    redis.expire(userKey, 900),
    redis.expire(ipKey, 900),
  ]);
  if (userAttempts >= 10) {
    await redis.set(`login:manual_unlock:${role}:${userId}`, '1', 'EX', 86400);
  }
}

async function clearLoginFailures({ role, userId, ip }) {
  await Promise.all([
    redis.del(`login:fail:${role}:${userId}`),
    redis.del(`login:fail:ip:${role}:${ip}`),
  ]);
}

async function loginCitizen({ citizenId, password }, reqMeta) {
  const user = await authRepository.findCitizenByCitizenId(citizenId);
  const genericError = createHttpError(401, 'Invalid credentials');
  if (!user) {
    throw genericError;
  }
  await checkLockout({ role: 'citizen', userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid || !user.is_verified) {
    await recordLoginFailure({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
    throw genericError;
  }
  await clearLoginFailures({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
  return issueSession('citizen', user);
}

async function startTwoFactorLogin(role, identifier, password, reqMeta) {
  const genericError = createHttpError(401, 'Invalid credentials');
  const finder = {
    admin: authRepository.findAdminByUsernameOrEmail,
    masteradmin: authRepository.findMasterAdminByUsernameOrEmail,
    deo: authRepository.findDeoByUsernameOrEmail,
    minister: authRepository.findMinisterByUsernameOrEmail,
  }[role];

  const user = await finder(identifier);
  if (!user) {
    throw genericError;
  }
  await checkLockout({ role, userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await recordLoginFailure({ role, userId: user.id, ip: reqMeta.ip });
    throw genericError;
  }

  if ((role === 'admin' || role === 'deo') && !user.is_verified) {
    throw createHttpError(403, 'Account verification required');
  }

  if (user.status !== 'active') {
    throw createHttpError(403, 'Account not active');
  }

  if (role === 'minister' || role === 'admin' || role === 'masteradmin' || role === 'deo') {
    await clearLoginFailures({ role, userId: user.id, ip: reqMeta.ip });
    return issueSession(role, user);
  }
  throw createHttpError(500, 'Unsupported login flow');
}

async function forgotCitizenPassword({ aadhaarNumber, email, captchaToken }, reqMeta) {
  const captchaValid = await verifyCaptcha(captchaToken, reqMeta.ip);
  if (!captchaValid) {
    throw createHttpError(400, 'CAPTCHA verification failed');
  }

  const user = await authRepository.findCitizenByForgotPassword(sha256(aadhaarNumber), email);
  if (!user) {
    return { message: 'If that ID exists, instructions were sent.' };
  }

  const otp = await generateOtp({
    role: 'citizen',
    userId: user.id,
    purpose: 'password_reset',
    ip: reqMeta.ip,
  });

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'Citizen Portal password reset OTP',
      text: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
    });
  }

  await sendSms({
    to: user.mobile_number,
    message: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
  });

  return { message: 'If that ID exists, instructions were sent.' };
}

async function resetCitizenPassword({ citizenId, otp, password }, reqMeta) {
  const user = await authRepository.findCitizenByCitizenId(citizenId);
  if (!user) {
    return { message: 'Password reset completed if the account exists.' };
  }

  const valid = await verifyOtp({
    role: 'citizen',
    userId: user.id,
    purpose: 'password_reset',
    ip: reqMeta.ip,
    otp,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await authRepository.updatePassword('citizen', user.id, passwordHash);
  await redis.set(`password_changed:citizen:${user.id}`, String(Date.now()), 'EX', 86400);
  return { message: 'Password reset completed if the account exists.' };
}

async function refreshSession(refreshToken) {
  let payload;
  let role;
  for (const candidate of ['citizen', 'admin', 'masteradmin', 'deo', 'minister']) {
    try {
      payload = verifyJwtByRole(candidate, refreshToken);
      if (payload.type === 'refresh') {
        role = candidate;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!payload || !role) {
    throw createHttpError(401, 'Unauthorized');
  }

  const stored = await authRepository.findActiveRefreshToken(payload.jti);
  if (!stored || stored.token_hash !== sha256(refreshToken)) {
    throw createHttpError(401, 'Unauthorized');
  }

  const user = await authRepository.findUserById(role, payload.sub);
  if (!user) {
    throw createHttpError(401, 'Unauthorized');
  }

  const session = await issueSession(role, user);
  const newPayload = verifyJwtByRole(role, session.refreshToken);
  const replacement = await authRepository.findActiveRefreshToken(newPayload.jti);
  await authRepository.revokeRefreshToken(stored.id, replacement.id);
  return session;
}

async function logout(role, token, refreshToken) {
  const accessPayload = verifyJwtByRole(role, token);
  const ttl = Math.max(accessPayload.exp - Math.floor(Date.now() / 1000), 1);
  await redis.set(`revoked:jti:${accessPayload.jti}`, '1', 'EX', ttl);

  if (refreshToken) {
    const refreshPayload = verifyJwtByRole(role, refreshToken);
    const stored = await authRepository.findActiveRefreshToken(refreshPayload.jti);
    if (stored) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  }

  return { message: 'Logged out successfully' };
}

module.exports = {
  registerCitizen,
  verifyCitizenRegistration,
  verifyAdminRegistration,
  verifyDeoRegistration,
  resendAdminVerificationCode,
  resendDeoVerificationCode,
  loginCitizen,
  startTwoFactorLogin,
  forgotCitizenPassword,
  resetCitizenPassword,
  refreshSession,
  logout,
};
