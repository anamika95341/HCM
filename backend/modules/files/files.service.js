const crypto = require('crypto');
const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const filesRepository = require('./files.repository');

const SIGNED_FILE_TTL_SECONDS = 300;

async function createSignedFileAccess({ fileId, actorRole, actorId, scope = {} }) {
  const token = crypto.randomUUID();
  await redis.set(
    `signed-file:${token}`,
    JSON.stringify({
      fileId,
      actorRole,
      actorId,
      scope,
    }),
    'EX',
    SIGNED_FILE_TTL_SECONDS,
  );

  return {
    token,
    expiresInSeconds: SIGNED_FILE_TTL_SECONDS,
    url: `/api/v1/files/access/${fileId}?token=${encodeURIComponent(token)}`,
  };
}

async function resolveSignedFileAccess(fileId, token) {
  if (!token) {
    throw createHttpError(401, 'Missing file access token');
  }

  const raw = await redis.get(`signed-file:${token}`);
  if (!raw) {
    throw createHttpError(401, 'File access token expired');
  }

  const payload = JSON.parse(raw);
  if (payload.fileId !== fileId) {
    throw createHttpError(403, 'Invalid file access token');
  }

  const file = await filesRepository.findUploadedFileById(fileId);
  if (!file) {
    throw createHttpError(404, 'File not found');
  }

  return file;
}

module.exports = {
  createSignedFileAccess,
  resolveSignedFileAccess,
};
