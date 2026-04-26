const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/env');
const logger = require('../utils/logger');

function clampSignedUrlExpiry(seconds) {
  if (!Number.isFinite(seconds)) {
    return 90;
  }
  return Math.min(120, Math.max(60, Math.trunc(seconds)));
}

function buildStorageConfig(overrides = {}) {
  const config = {
    storageMode: overrides.storageMode ?? env.storageMode,
    bucket: overrides.bucket ?? env.s3Bucket,
    region: overrides.region ?? env.s3Region,
    endpoint: overrides.endpoint ?? env.s3Endpoint,
    publicEndpoint: overrides.publicEndpoint ?? env.s3PublicEndpoint,
    accessKeyId: overrides.accessKeyId ?? env.s3AccessKeyId,
    secretAccessKey: overrides.secretAccessKey ?? env.s3SecretAccessKey,
    forcePathStyle: overrides.forcePathStyle ?? env.s3ForcePathStyle,
    signedUrlExpirySeconds: clampSignedUrlExpiry(
      overrides.signedUrlExpirySeconds ?? env.s3SignedUrlExpirySeconds,
    ),
  };

  if (!['aws', 'local'].includes(config.storageMode)) {
    throw new Error(`Unsupported STORAGE_MODE: ${config.storageMode}`);
  }

  if (!config.bucket) {
    throw new Error('S3_BUCKET is required for object storage');
  }

  if (config.storageMode === 'local') {
    if (!config.endpoint) {
      throw new Error('S3_ENDPOINT is required when STORAGE_MODE=local');
    }
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('MinIO credentials are required when STORAGE_MODE=local');
    }
  }

  return config;
}

function buildS3ClientConfig(config, options = {}) {
  const clientConfig = {
    region: config.region,
    forcePathStyle: Boolean(config.forcePathStyle),
    requestChecksumCalculation: 'WHEN_REQUIRED',
  };

  const endpoint = options.usePublicEndpoint && config.publicEndpoint
    ? config.publicEndpoint
    : config.endpoint;

  if (endpoint) {
    clientConfig.endpoint = endpoint;
  }

  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }

  return clientConfig;
}

function createS3Client(config = buildStorageConfig(), options = {}) {
  return new S3Client(buildS3ClientConfig(config, options));
}

function isNotFoundError(error) {
  return error?.$metadata?.httpStatusCode === 404
    || error?.name === 'NotFound'
    || error?.name === 'NoSuchBucket';
}

function buildContentDisposition(filename) {
  if (!filename) {
    return undefined;
  }
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function createStorageService(options = {}) {
  const config = options.config || buildStorageConfig();
  const s3Client = options.s3Client || createS3Client(config);
  const signingClient = options.signingClient
    || (options.s3Client ? options.s3Client : createS3Client(config, { usePublicEndpoint: true }));
  const presign = options.presign || getSignedUrl;

  async function generateUploadUrl({ key, contentType, expiresIn, metadata = {}, publicEndpoint }) {
    const signer = publicEndpoint
      ? createS3Client({ ...config, publicEndpoint }, { usePublicEndpoint: true })
      : signingClient;
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    });

    const uploadUrl = await presign(signer, command, {
      expiresIn: clampSignedUrlExpiry(expiresIn ?? config.signedUrlExpirySeconds),
    });

    return {
      uploadUrl,
      bucket: config.bucket,
      key,
      expiresIn: clampSignedUrlExpiry(expiresIn ?? config.signedUrlExpirySeconds),
    };
  }

  async function generateDownloadUrl({ key, filename, contentType, expiresIn, publicEndpoint }) {
    const signer = publicEndpoint
      ? createS3Client({ ...config, publicEndpoint }, { usePublicEndpoint: true })
      : signingClient;
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ResponseContentDisposition: buildContentDisposition(filename),
      ResponseContentType: contentType || undefined,
    });

    const downloadUrl = await presign(signer, command, {
      expiresIn: clampSignedUrlExpiry(expiresIn ?? config.signedUrlExpirySeconds),
    });

    return {
      downloadUrl,
      bucket: config.bucket,
      key,
      expiresIn: clampSignedUrlExpiry(expiresIn ?? config.signedUrlExpirySeconds),
    };
  }

  async function headObject({ key }) {
    return s3Client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  }

  async function ensureBucket() {
    if (config.storageMode !== 'local') {
      return;
    }

    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      logger.info('Local object storage bucket ready', {
        bucket: config.bucket,
        endpoint: config.endpoint,
      });
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }

      logger.warn('Local object storage bucket missing, creating', {
        bucket: config.bucket,
        endpoint: config.endpoint,
      });

      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: config.bucket }));
      } catch (createError) {
        const alreadyExists = createError?.name === 'BucketAlreadyOwnedByYou'
          || createError?.name === 'BucketAlreadyExists';
        if (!alreadyExists) {
          throw createError;
        }
      }

      logger.info('Local object storage bucket created', {
        bucket: config.bucket,
        endpoint: config.endpoint,
      });
    }
  }

  return {
    config,
    s3Client,
    signingClient,
    generateUploadUrl,
    generateDownloadUrl,
    headObject,
    ensureBucket,
  };
}

let defaultStorageService = null;

function getStorageService() {
  if (!defaultStorageService) {
    defaultStorageService = createStorageService();
  }
  return defaultStorageService;
}

module.exports = {
  buildStorageConfig,
  buildS3ClientConfig,
  clampSignedUrlExpiry,
  createS3Client,
  createStorageService,
  getStorageService,
  generateUploadUrl: (...args) => getStorageService().generateUploadUrl(...args),
  generateDownloadUrl: (...args) => getStorageService().generateDownloadUrl(...args),
  headObject: (...args) => getStorageService().headObject(...args),
  ensureBucket: (...args) => getStorageService().ensureBucket(...args),
  getConfig: () => getStorageService().config,
};
