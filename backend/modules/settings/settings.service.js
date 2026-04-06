const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const logger = require('../../utils/logger');
const { writeAuditLog } = require('../../utils/audit');
const authRepository = require('../auth/auth.repository');
const settingsRepository = require('./settings.repository');

const rolePermissions = {
  citizen: { allowName: true, allowEmail: true, allowContact: true },
  admin: { allowName: true, allowEmail: false, allowContact: true },
  masteradmin: { allowName: true, allowEmail: false, allowContact: true },
  minister: { allowName: true, allowEmail: true, allowContact: true },
  deo: { allowName: false, allowEmail: false, allowContact: true },
};

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    throw createHttpError(400, 'Name is required');
  }

  const firstName = parts[0];
  if (parts.length === 1) {
    return {
      firstName,
      middleName: null,
      lastName: null,
      hasMiddleName: true,
      hasLastName: true,
    };
  }

  if (parts.length === 2) {
    return {
      firstName,
      middleName: null,
      lastName: parts[1],
      hasMiddleName: true,
      hasLastName: true,
    };
  }

  return {
    firstName,
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts.at(-1),
    hasMiddleName: true,
    hasLastName: true,
  };
}

function mapConstraintError(error) {
  if (error?.code !== '23505') return null;
  const constraint = String(error.constraint || '');
  if (constraint.includes('email')) {
    return createHttpError(409, 'Email already exists');
  }
  if (constraint.includes('mobile') || constraint.includes('phone')) {
    return createHttpError(409, 'Contact number already exists');
  }
  if (constraint.includes('username')) {
    return createHttpError(409, 'Username already exists');
  }
  return createHttpError(409, 'Profile details already exist');
}

async function getProfile(role, userId) {
  const profile = await settingsRepository.getProfile(role, userId);
  if (!profile) {
    throw createHttpError(404, 'Profile not found');
  }
  return profile;
}

async function updateProfile(role, userId, payload, reqMeta) {
  const permissions = rolePermissions[role];
  if (!permissions) {
    throw createHttpError(400, 'Unsupported role');
  }

  const updates = {};
  if (permissions.allowName && payload.name !== undefined) {
    Object.assign(updates, splitName(payload.name));
  }
  if (permissions.allowContact && payload.contact !== undefined) {
    updates.contact = payload.contact;
  }
  if (permissions.allowEmail && payload.email !== undefined) {
    updates.email = payload.email;
  }

  if (Object.keys(updates).length === 0) {
    return getProfile(role, userId);
  }

  try {
    const profile = await settingsRepository.updateProfile(role, userId, updates);
    if (!profile) {
      throw createHttpError(404, 'Profile not found');
    }

    await writeAuditLog({
      actorRole: role,
      actorId: userId,
      entityType: role,
      entityId: userId,
      action: 'profile_updated',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
      metadata: {
        changedFields: Object.keys(updates).filter((key) => !key.startsWith('has')),
      },
    });

    return profile;
  } catch (error) {
    throw mapConstraintError(error) || error;
  }
}

async function changePassword(role, userId, payload, reqMeta) {
  const user = await authRepository.findActiveUserById(role, userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const valid = await bcrypt.compare(payload.currentPassword, user.password_hash);
  if (!valid) {
    throw createHttpError(400, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, 12);
  await authRepository.updatePassword(role, userId, passwordHash);
  await authRepository.revokeAllUserRefreshTokens(role, userId);

  try {
    await redis.set(`password_changed:${role}:${userId}`, String(Date.now()), 'EX', 86400);
  } catch (error) {
    logger.warn('Password-change cache marker unavailable; relying on DB timestamp', {
      role,
      userId,
      error,
    });
  }

  await writeAuditLog({
    actorRole: role,
    actorId: userId,
    entityType: role,
    entityId: userId,
    action: 'password_changed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Password updated successfully' };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
