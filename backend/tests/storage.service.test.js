jest.mock('@aws-sdk/client-s3', () => {
  class BaseCommand {
    constructor(input) {
      this.input = input;
    }
  }

  return {
    S3Client: jest.fn().mockImplementation((config) => ({
      config,
      send: jest.fn(),
    })),
    PutObjectCommand: class PutObjectCommand extends BaseCommand {},
    GetObjectCommand: class GetObjectCommand extends BaseCommand {},
    HeadObjectCommand: class HeadObjectCommand extends BaseCommand {},
    HeadBucketCommand: class HeadBucketCommand extends BaseCommand {},
    CreateBucketCommand: class CreateBucketCommand extends BaseCommand {},
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const {
  buildStorageConfig,
  buildS3ClientConfig,
  clampSignedUrlExpiry,
  createStorageService,
} = require('../services/storageService');

describe('storage service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds MinIO-compatible client config for local mode', () => {
    const config = buildStorageConfig({
      storageMode: 'local',
      bucket: 'portal-private-files',
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      accessKeyId: 'admin',
      secretAccessKey: 'password',
      forcePathStyle: true,
      signedUrlExpirySeconds: 90,
    });

    expect(buildS3ClientConfig(config)).toEqual({
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'admin',
        secretAccessKey: 'password',
      },
    });
  });

  test('omits static credentials in aws mode so IAM roles can be used', () => {
    const config = buildStorageConfig({
      storageMode: 'aws',
      bucket: 'portal-private-files',
      region: 'ap-south-1',
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: false,
      signedUrlExpirySeconds: 90,
    });

    expect(buildS3ClientConfig(config)).toEqual({
      region: 'ap-south-1',
      forcePathStyle: false,
    });
  });

  test('creates signed PUT and GET URLs with bounded expiry', async () => {
    const s3Client = { send: jest.fn() };
    getSignedUrl
      .mockResolvedValueOnce('http://upload-url')
      .mockResolvedValueOnce('http://download-url');

    const service = createStorageService({
      config: buildStorageConfig({
        storageMode: 'local',
        bucket: 'portal-private-files',
        region: 'us-east-1',
        endpoint: 'http://localhost:9000',
        accessKeyId: 'admin',
        secretAccessKey: 'password',
        forcePathStyle: true,
        signedUrlExpirySeconds: 90,
      }),
      s3Client,
      presign: getSignedUrl,
    });

    const upload = await service.generateUploadUrl({
      key: 'deo/user-1/sample.mp4',
      contentType: 'video/mp4',
      expiresIn: 5,
    });
    const download = await service.generateDownloadUrl({
      key: 'deo/user-1/sample.mp4',
      filename: 'sample.mp4',
      contentType: 'video/mp4',
      expiresIn: 999,
    });

    expect(upload).toEqual({
      uploadUrl: 'http://upload-url',
      bucket: 'portal-private-files',
      key: 'deo/user-1/sample.mp4',
      expiresIn: 60,
    });
    expect(download).toEqual({
      downloadUrl: 'http://download-url',
      bucket: 'portal-private-files',
      key: 'deo/user-1/sample.mp4',
      expiresIn: 120,
    });
    expect(getSignedUrl).toHaveBeenNthCalledWith(1, s3Client, expect.anything(), { expiresIn: 60 });
    expect(getSignedUrl).toHaveBeenNthCalledWith(2, s3Client, expect.anything(), { expiresIn: 120 });
  });

  test('creates the bucket automatically in local mode when missing', async () => {
    const s3Client = {
      send: jest.fn()
        .mockRejectedValueOnce({ name: 'NotFound', $metadata: { httpStatusCode: 404 } })
        .mockResolvedValueOnce({}),
    };

    const service = createStorageService({
      config: buildStorageConfig({
        storageMode: 'local',
        bucket: 'portal-private-files',
        region: 'us-east-1',
        endpoint: 'http://localhost:9000',
        accessKeyId: 'admin',
        secretAccessKey: 'password',
        forcePathStyle: true,
        signedUrlExpirySeconds: 90,
      }),
      s3Client,
      presign: getSignedUrl,
    });

    await service.ensureBucket();

    expect(s3Client.send).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(s3Client.send).toHaveBeenNthCalledWith(2, expect.any(CreateBucketCommand));
  });

  test('skips bucket creation in aws mode', async () => {
    const s3Client = { send: jest.fn() };
    const service = createStorageService({
      config: buildStorageConfig({
        storageMode: 'aws',
        bucket: 'portal-private-files',
        region: 'ap-south-1',
        endpoint: '',
        accessKeyId: '',
        secretAccessKey: '',
        forcePathStyle: false,
        signedUrlExpirySeconds: 90,
      }),
      s3Client,
      presign: getSignedUrl,
    });

    await service.ensureBucket();

    expect(s3Client.send).not.toHaveBeenCalled();
  });

  test('clamps pre-signed URL expiry between 60 and 120 seconds', () => {
    expect(clampSignedUrlExpiry(10)).toBe(60);
    expect(clampSignedUrlExpiry(90)).toBe(90);
    expect(clampSignedUrlExpiry(999)).toBe(120);
  });
});
