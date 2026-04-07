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
const logger = require('../../utils/logger');
const { publishAuthEvent } = require('../../utils/authStream');
const authRepository = require('./auth.repository');
const citizenRepository = require('../citizen/citizen.repository');
const {
  notifyMasterAdminAccountVerified,
  notifyMasterAdminSecurityAlert,
} = require('../notifications/notifications.service');
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
  try {
    return jwt.verify(token, config.publicKey, {
      algorithms: ['RS256'],
      audience: config.audience,
      issuer: config.issuer,
    });
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError' || error?.name === 'NotBeforeError') {
      throw createHttpError(401, 'Unauthorized');
    }
    throw error;
  }
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

async function emitAuthEvent(payload) {
  await publishAuthEvent(redis, payload);
}

async function registerCitizen(payload, reqMeta) {
  let stage = 'start';
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const registrationPayload = {
    ...payload,
    aadhaarHash: sha256(payload.aadhaarNumber),
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash,
    localMp: lookupMp({ state: payload.state }),
  };

  try {
    stage = 'check-existing-citizen';
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
      stage = 'update-pending-citizen';
      citizen = await citizenRepository.updatePendingCitizen(existingCitizen.id, registrationPayload);
    } else {
      stage = 'create-citizen';
      citizen = await citizenRepository.createCitizen(registrationPayload);
      createdNewCitizen = true;
    }
    const destination = payload.preferredVerificationChannel === 'email' ? payload.email : payload.mobileNumber;
    try {
      stage = 'generate-otp';
      const otp = await generateOtp({
        role: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
        ip: reqMeta.ip,
        requestId: reqMeta.requestId,
      });

      stage = 'clear-old-verification-records';
      await authRepository.clearVerificationRecords({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
      });

      stage = 'insert-verification-record';
      await authRepository.insertVerificationRecord({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
        channel: payload.preferredVerificationChannel,
        destination,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      if (payload.preferredVerificationChannel === 'email') {
        stage = 'send-email';
        await sendMail({
          to: payload.email,
          subject: 'Verify your Citizen Portal account',
          text: `Your OTP is ${otp}. It expires in 5 minutes.`,
        });
      } else {
        stage = 'send-sms';
        await sendSms({
          to: payload.mobileNumber,
          message: `Your OTP is ${otp}. It expires in 5 minutes.`,
        });
      }
    } catch (error) {
      stage = `${stage}-rollback`;
      await authRepository.clearVerificationRecords({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
      });
      if (createdNewCitizen) {
        await citizenRepository.deletePendingCitizenById(citizen.id);
      }
      logger.error('Citizen registration verification dispatch failed', {
        stage,
        email: payload.email,
        mobileNumber: payload.mobileNumber,
        preferredVerificationChannel: payload.preferredVerificationChannel,
        citizenId: citizen.id,
        error,
      });
      throw createHttpError(502, 'Unable to send citizen verification code');
    }

    stage = 'write-audit-log';
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
  } catch (error) {
    logger.error('Citizen registration failed', {
      stage,
      email: payload.email,
      mobileNumber: payload.mobileNumber,
      preferredVerificationChannel: payload.preferredVerificationChannel,
      error,
    });
    throw error;
  }
}

async function verifyCitizenRegistration({ userId, otp, ip }, reqMeta) {
  const valid = await verifyOtp({
    role: 'citizen',
    userId,
    purpose: 'registration_verification',
    ip,
    otp,
    requestId: reqMeta.requestId,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  let citizenId;
  let assigned = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sequence = crypto.randomInt(0, 100000000);
    citizenId = generateCitizenId(sequence);
    try {
      await authRepository.updateCitizenVerification(userId, citizenId);
      assigned = true;
      break;
    } catch (err) {
      if (err?.code === '23505') {
        continue;
      }
      throw err;
    }
  }
  if (!assigned) {
    throw createHttpError(500, 'Failed to generate a unique citizen ID. Please try again.');
  }
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
    requestId: reqMeta.requestId,
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

  await notifyMasterAdminAccountVerified({
    accountRole: 'deo',
    accountId: user.id,
    usernameOrEmail: user.username || user.email || usernameOrEmail,
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
    requestId: reqMeta.requestId,
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

  await notifyMasterAdminAccountVerified({
    accountRole: 'admin',
    accountId: user.id,
    usernameOrEmail: user.username || user.email || usernameOrEmail,
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
    requestId: reqMeta.requestId,
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
    requestId: reqMeta.requestId,
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
  let userAttempts;
  let ipAttempts;
  try {
    [userAttempts, ipAttempts] = await Promise.all([
      redis.get(userKey),
      redis.get(ipKey),
    ]);
  } catch (error) {
    logger.warn('Login lockout check unavailable, bypassing Redis-backed lockout', {
      role,
      userId,
      ip,
      error,
    });
    return;
  }

  if (Number(userAttempts || 0) >= 10) {
    const alertKey = `lockout:masteradmin_alert:${role}:${userId}:manual_unlock_required`;
    try {
      const alreadyAlerted = await redis.get(alertKey);
      if (!alreadyAlerted) {
        await notifyMasterAdminSecurityAlert({
          affectedRole: role,
          affectedUserId: userId,
          severity: 'manual_unlock_required',
          email: email || null,
        });
        await redis.set(alertKey, '1', 'EX', 86400);
      }
    } catch (error) {
      logger.warn('Masteradmin security alert dispatch failed', { role, userId, error });
    }
    throw createHttpError(423, 'Account requires manual unlock');
  }
  if (Number(userAttempts || 0) >= 5 || Number(ipAttempts || 0) >= 5) {
    if (email) {
      const notifiedKey = `lockout:notified:${role}:${userId}`;
      try {
        const alreadyNotified = await redis.get(notifiedKey);
        if (!alreadyNotified) {
          await sendMail({
            to: email,
            subject: 'Account temporarily locked',
            text: 'Your account has been temporarily locked due to repeated failed login attempts.',
          });
          await redis.set(notifiedKey, '1', 'EX', 900);
        }
      } catch (err) {
        logger.warn('Lockout notification check failed', { role, userId, err });
      }
    }
    const alertKey = `lockout:masteradmin_alert:${role}:${userId}:temporary_lockout`;
    try {
      const alreadyAlerted = await redis.get(alertKey);
      if (!alreadyAlerted) {
        await notifyMasterAdminSecurityAlert({
          affectedRole: role,
          affectedUserId: userId,
          severity: 'temporary_lockout',
          email: email || null,
        });
        await redis.set(alertKey, '1', 'EX', 900);
      }
    } catch (error) {
      logger.warn('Masteradmin security alert dispatch failed', { role, userId, error });
    }
    throw createHttpError(423, 'Account temporarily locked');
  }
}

async function recordLoginFailure({ role, userId, ip }) {
  const userKey = `login:fail:${role}:${userId}`;
  const ipKey = `login:fail:ip:${role}:${ip}`;
  try {
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
  } catch (error) {
    logger.warn('Login failure counter unavailable, skipping Redis-backed lockout write', {
      role,
      userId,
      ip,
      error,
    });
  }
}

async function clearLoginFailures({ role, userId, ip }) {
  try {
    await Promise.all([
      redis.del(`login:fail:${role}:${userId}`),
      redis.del(`login:fail:ip:${role}:${ip}`),
    ]);
  } catch (error) {
    logger.warn('Login failure cleanup unavailable, skipping Redis-backed lockout cleanup', {
      role,
      userId,
      ip,
      error,
    });
  }
}

async function loginCitizen({ citizenId, password }, reqMeta) {
  const user = await authRepository.findCitizenByCitizenId(citizenId);
  const genericError = createHttpError(401, 'Invalid credentials');
  if (!user) {
    await emitAuthEvent({
      event: 'login_failure',
      role: 'citizen',
      userId: 'unknown',
      ip: reqMeta.ip,
      reason: 'user_not_found',
      requestId: reqMeta.requestId,
    });
    throw genericError;
  }
  await checkLockout({ role: 'citizen', userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await recordLoginFailure({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
    await emitAuthEvent({
      event: 'login_failure',
      role: 'citizen',
      userId: user.id,
      ip: reqMeta.ip,
      reason: 'invalid_credentials',
      requestId: reqMeta.requestId,
    });
    throw genericError;
  }
  if (!user.is_verified) {
    await emitAuthEvent({
      event: 'login_failure',
      role: 'citizen',
      userId: user.id,
      ip: reqMeta.ip,
      reason: 'account_not_verified',
      requestId: reqMeta.requestId,
    });
    throw createHttpError(403, 'Please verify your account before logging in');
  }
  await clearLoginFailures({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
  const session = await issueSession('citizen', user);
  await emitAuthEvent({
    event: 'login_success',
    role: 'citizen',
    userId: user.id,
    ip: reqMeta.ip,
    requestId: reqMeta.requestId,
  });
  return session;
}

async function loginOperator(role, identifier, password, reqMeta) {
  const genericError = createHttpError(401, 'Invalid credentials');
  const finder = {
    admin: authRepository.findAdminByUsernameOrEmail,
    masteradmin: authRepository.findMasterAdminByUsernameOrEmail,
    deo: authRepository.findDeoByUsernameOrEmail,
    minister: authRepository.findMinisterByUsernameOrEmail,
  }[role];

  const user = await finder(identifier);
  if (!user) {
    await emitAuthEvent({
      event: 'login_failure',
      role,
      userId: 'unknown',
      ip: reqMeta.ip,
      reason: 'user_not_found',
      requestId: reqMeta.requestId,
    });
    throw genericError;
  }
  await checkLockout({ role, userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await recordLoginFailure({ role, userId: user.id, ip: reqMeta.ip });
    await emitAuthEvent({
      event: 'login_failure',
      role,
      userId: user.id,
      ip: reqMeta.ip,
      reason: 'invalid_credentials',
      requestId: reqMeta.requestId,
    });
    throw genericError;
  }

  if ((role === 'admin' || role === 'deo') && !user.is_verified) {
    await emitAuthEvent({
      event: 'login_failure',
      role,
      userId: user.id,
      ip: reqMeta.ip,
      reason: 'account_not_verified',
      requestId: reqMeta.requestId,
    });
    throw createHttpError(403, 'Account verification required');
  }

  if (user.status !== 'active') {
    await emitAuthEvent({
      event: 'login_failure',
      role,
      userId: user.id,
      ip: reqMeta.ip,
      reason: 'account_not_active',
      requestId: reqMeta.requestId,
    });
    throw createHttpError(403, 'Account not active');
  }

  if (role === 'minister' || role === 'admin' || role === 'masteradmin' || role === 'deo') {
    await clearLoginFailures({ role, userId: user.id, ip: reqMeta.ip });
    const session = await issueSession(role, user);
    await emitAuthEvent({
      event: 'login_success',
      role,
      userId: user.id,
      ip: reqMeta.ip,
      requestId: reqMeta.requestId,
    });
    return session;
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
    requestId: reqMeta.requestId,
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
    requestId: reqMeta.requestId,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await authRepository.updatePassword('citizen', user.id, passwordHash);
  try {
    await redis.set(`password_changed:citizen:${user.id}`, String(Date.now()), 'EX', 86400);
  } catch (error) {
    logger.warn('Password-change cache marker unavailable; relying on DB timestamp', {
      role: 'citizen',
      userId: user.id,
      error,
    });
  }
  await emitAuthEvent({
    event: 'password_reset',
    role: 'citizen',
    userId: user.id,
    ip: reqMeta.ip,
    requestId: reqMeta.requestId,
  });
  return { message: 'Password reset completed if the account exists.' };
}

async function refreshSession(refreshToken) {
  const decoded = jwt.decode(refreshToken);
  const role = decoded?.role;

  if (!['citizen', 'admin', 'masteradmin', 'deo', 'minister'].includes(role)) {
    throw createHttpError(401, 'Unauthorized');
  }
  const payload = verifyJwtByRole(role, refreshToken);
  if (payload.type !== 'refresh') {
    throw createHttpError(401, 'Unauthorized');
  }

  const stored = await authRepository.findActiveRefreshToken(payload.jti);
  if (!stored || stored.token_hash !== sha256(refreshToken)) {
    throw createHttpError(401, 'Unauthorized');
  }

  const user = await authRepository.findActiveUserById(role, payload.sub);
  if (!user) {
    throw createHttpError(401, 'Unauthorized');
  }

  const session = await issueSession(role, user);
  const newPayload = verifyJwtByRole(role, session.refreshToken);
  const replacement = await authRepository.findActiveRefreshToken(newPayload.jti);
  await authRepository.revokeRefreshToken(stored.id, replacement.id);
  return session;
}

async function logout(role, token, refreshToken, reqMeta = {}) {
  const accessPayload = verifyJwtByRole(role, token);
  const ttl = Math.max(accessPayload.exp - Math.floor(Date.now() / 1000), 1);
  try {
    await redis.set(`revoked:jti:${accessPayload.jti}`, '1', 'EX', ttl);
    await emitAuthEvent({
      event: 'token_revoked',
      role,
      userId: accessPayload.sub,
      ip: reqMeta.ip || 'logout',
      reason: 'access_token',
      requestId: reqMeta.requestId,
    });
  } catch (error) {
    logger.warn('Logout token revocation cache unavailable; refresh token revocation will still proceed', {
      role,
      userId: accessPayload.sub,
      jti: accessPayload.jti,
      error,
    });
    await emitAuthEvent({
      event: 'token_revoked',
      role,
      userId: accessPayload.sub,
      ip: reqMeta.ip || 'logout',
      reason: 'access_token_cache_unavailable',
      requestId: reqMeta.requestId,
    });
  }

  if (refreshToken) {
    const refreshPayload = verifyJwtByRole(role, refreshToken);
    const stored = await authRepository.findActiveRefreshToken(refreshPayload.jti);
    if (stored) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  }

  await emitAuthEvent({
    event: 'logout',
    role,
    userId: accessPayload.sub,
    ip: reqMeta.ip || 'logout',
    requestId: reqMeta.requestId,
  });

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
  loginOperator,
  forgotCitizenPassword,
  resetCitizenPassword,
  refreshSession,
  logout,
};
