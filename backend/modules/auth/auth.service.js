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
const { verifyAdminRegistrationToken } = require('../../utils/tokenVerify');
const { writeAuditLog } = require('../../utils/audit');
const authRepository = require('./auth.repository');
const citizenRepository = require('../citizen/citizen.repository');
const adminRepository = require('../admin/admin.repository');
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
  const citizen = await citizenRepository.createCitizen({
    ...payload,
    aadhaarHash: sha256(payload.aadhaarNumber),
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash,
    localMp: lookupMp({ state: payload.state }),
  });

  const destination = payload.preferredVerificationChannel === 'email' ? payload.email : payload.mobileNumber;
  const otp = await generateOtp({
    role: 'citizen',
    userId: citizen.id,
    purpose: 'registration_verification',
    ip: reqMeta.ip,
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

  if (role === 'minister') {
    await clearLoginFailures({ role, userId: user.id, ip: reqMeta.ip });
    return issueSession(role, user);
  }

  const otp = await generateOtp({
    role,
    userId: user.id,
    purpose: 'login_2fa',
    ip: reqMeta.ip,
  });

  await authRepository.insertVerificationRecord({
    userRole: role,
    userId: user.id,
    purpose: 'login_2fa',
    channel: user.email ? 'email' : 'sms',
    destination: user.email || user.phone_number,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'Your 2FA OTP',
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });
  } else {
    await sendSms({
      to: user.phone_number,
      message: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });
  }

  const config = getRoleConfig(role);
  const loginToken = jwt.sign(
    { sub: user.id, role, type: 'login_challenge', ip: reqMeta.ip },
    config.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '5m',
      audience: role,
      issuer: config.issuer,
    }
  );

  return { loginToken };
}

async function verifyTwoFactorLogin({ loginToken, otp }, reqMeta) {
  let payload;
  let user;
  for (const role of ['admin', 'deo']) {
    try {
      payload = verifyJwtByRole(role, loginToken);
      if (payload.type === 'login_challenge') {
        user = await authRepository.findUserById(role, payload.sub);
        if (user) {
          const validOtp = await verifyOtp({
            role,
            userId: payload.sub,
            purpose: 'login_2fa',
            ip: reqMeta.ip,
            otp,
          });
          if (!validOtp) {
            await recordLoginFailure({ role, userId: payload.sub, ip: reqMeta.ip });
            throw createHttpError(401, 'Invalid credentials');
          }
          await clearLoginFailures({ role, userId: payload.sub, ip: reqMeta.ip });
          return issueSession(role, user);
        }
      }
    } catch (error) {
      continue;
    }
  }
  throw createHttpError(401, 'Invalid credentials');
}

async function verifyAdminRegistrationGate(token) {
  const payload = verifyAdminRegistrationToken(token);
  const existing = await authRepository.findAdminTokenRecordByJti(payload.jti);
  if (existing?.used_at) {
    throw createHttpError(400, 'Registration token already used');
  }
  await authRepository.createAdminTokenRecord({
    jti: payload.jti,
    subjectEmail: payload.sub,
    designation: payload.designation,
    expiresAt: new Date(payload.exp * 1000),
  });
  return payload;
}

async function registerAdmin(payload, reqMeta) {
  const gate = await verifyAdminRegistrationGate(payload.registrationToken);
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const admin = await adminRepository.createAdmin({
    ...payload,
    aadhaarHash: sha256(payload.aadhaarNumber),
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash,
  });
  await authRepository.markAdminTokenUsed(gate.jti, admin.id);
  await writeAuditLog({
    actorRole: 'admin',
    actorId: admin.id,
    entityType: 'admin',
    entityId: admin.id,
    action: 'admin_registered',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
  return admin;
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
  for (const candidate of ['citizen', 'admin', 'deo', 'minister']) {
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
  loginCitizen,
  startTwoFactorLogin,
  verifyTwoFactorLogin,
  verifyAdminRegistrationGate,
  registerAdmin,
  forgotCitizenPassword,
  resetCitizenPassword,
  refreshSession,
  logout,
};
