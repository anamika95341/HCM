jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../modules/files/files.repository', () => ({
  findUploadedFileById: jest.fn(),
  findFileByS3Key: jest.fn(),
  createFile: jest.fn(),
  findFileRecordById: jest.fn(),
  listFilesVisibleToRole: jest.fn(),
  getCitizenMeetingById: jest.fn(),
  getAssignedMeetingForDeo: jest.fn(),
  getDeoCalendarEventById: jest.fn(),
  hasMinisterMeetingAccess: jest.fn(),
  hasMinisterEventAccess: jest.fn(),
}));

jest.mock('../modules/complaints/complaints.repository', () => ({
  getCitizenComplaintById: jest.fn(),
  getComplaintById: jest.fn(),
}));

jest.mock('../modules/meetings/meetings.repository', () => ({
  getCitizenMeetingById: jest.fn(),
  getMeetingById: jest.fn(),
}));

jest.mock('../services/storageService', () => ({
  generateUploadUrl: jest.fn(),
  generateDownloadUrl: jest.fn(),
  headObject: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const redis = require('../config/redis');
const filesRepository = require('../modules/files/files.repository');
const complaintsRepository = require('../modules/complaints/complaints.repository');
const storageService = require('../services/storageService');
const filesService = require('../modules/files/files.service');

describe('files service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');
    storageService.generateUploadUrl.mockResolvedValue({
      uploadUrl: 'http://upload-url',
      expiresIn: 90,
    });
    storageService.generateDownloadUrl.mockResolvedValue({
      downloadUrl: 'http://download-url',
      expiresIn: 90,
    });
  });

  test('allows a citizen to request an upload URL for a valid 5MB document', async () => {
    filesRepository.getCitizenMeetingById.mockResolvedValue({ id: 'meeting-1' });

    const result = await filesService.createUploadUrl({
      actorRole: 'citizen',
      actorId: 'citizen-1',
      body: {
        fileName: 'note.pdf',
        mimeType: 'application/pdf',
        size: 5 * 1024 * 1024,
        contextType: 'meeting',
        contextId: 'meeting-1',
      },
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
    });

    expect(result).toEqual(expect.objectContaining({
      uploadUrl: 'http://upload-url',
      expiresInSeconds: 90,
    }));
    expect(storageService.generateUploadUrl).toHaveBeenCalledWith(expect.objectContaining({
      contentType: 'application/pdf',
    }));
  });

  test('rejects citizen uploads above 5MB', async () => {
    await expect(
      filesService.createUploadUrl({
        actorRole: 'citizen',
        actorId: 'citizen-1',
        body: {
          fileName: 'big.pdf',
          mimeType: 'application/pdf',
          size: (5 * 1024 * 1024) + 1,
          contextType: 'general',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects citizen video uploads', async () => {
    await expect(
      filesService.createUploadUrl({
        actorRole: 'citizen',
        actorId: 'citizen-1',
        body: {
          fileName: 'clip.mp4',
          mimeType: 'video/mp4',
          size: 1024,
          contextType: 'general',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('allows DEO 20MB image and 100MB video uploads', async () => {
    filesRepository.getAssignedMeetingForDeo.mockResolvedValue({ id: 'meeting-1' });
    filesRepository.getDeoCalendarEventById.mockResolvedValue({ id: 'event-1' });

    await expect(
      filesService.createUploadUrl({
        actorRole: 'deo',
        actorId: 'deo-1',
        body: {
          fileName: 'photo.png',
          mimeType: 'image/png',
          size: 20 * 1024 * 1024,
          contextType: 'meeting',
          contextId: 'meeting-1',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).resolves.toEqual(expect.objectContaining({ uploadUrl: 'http://upload-url' }));

    await expect(
      filesService.createUploadUrl({
        actorRole: 'deo',
        actorId: 'deo-1',
        body: {
          fileName: 'video.mp4',
          mimeType: 'video/mp4',
          size: 100 * 1024 * 1024,
          contextType: 'event',
          contextId: 'event-1',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).resolves.toEqual(expect.objectContaining({ uploadUrl: 'http://upload-url' }));
  });

  test('rejects DEO uploads beyond role limits', async () => {
    filesRepository.getAssignedMeetingForDeo.mockResolvedValue({ id: 'meeting-1' });
    filesRepository.getDeoCalendarEventById.mockResolvedValue({ id: 'event-1' });

    await expect(
      filesService.createUploadUrl({
        actorRole: 'deo',
        actorId: 'deo-1',
        body: {
          fileName: 'photo.png',
          mimeType: 'image/png',
          size: (20 * 1024 * 1024) + 1,
          contextType: 'meeting',
          contextId: 'meeting-1',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      filesService.createUploadUrl({
        actorRole: 'deo',
        actorId: 'deo-1',
        body: {
          fileName: 'video.mp4',
          mimeType: 'video/mp4',
          size: (100 * 1024 * 1024) + 1,
          contextType: 'event',
          contextId: 'event-1',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects unsupported MIME types', async () => {
    await expect(
      filesService.createUploadUrl({
        actorRole: 'deo',
        actorId: 'deo-1',
        body: {
          fileName: 'archive.zip',
          mimeType: 'application/zip',
          size: 1024,
          contextType: 'general',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('blocks duplicate uploads before generating another URL', async () => {
    redis.set.mockResolvedValue(null);

    await expect(
      filesService.createUploadUrl({
        actorRole: 'citizen',
        actorId: 'citizen-1',
        body: {
          fileName: 'same.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          contextType: 'general',
        },
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(storageService.generateUploadUrl).not.toHaveBeenCalled();
  });

  test('creates signed legacy access for a citizen-owned complaint document', async () => {
    filesRepository.findUploadedFileById.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      entity_type: 'complaint_document',
      entity_id: 'complaint-1',
      original_name: 'evidence.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
      storage_path: '/tmp/evidence.pdf',
      created_at: '2026-04-06T10:00:00.000Z',
    });
    complaintsRepository.getCitizenComplaintById.mockResolvedValue({ id: 'complaint-1' });

    const result = await filesService.createLegacyDownloadAccess({
      fileId: '11111111-1111-1111-1111-111111111111',
      actorRole: 'citizen',
      actorId: 'citizen-1',
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
    });

    expect(result.file.name).toBe('evidence.pdf');
    expect(result.downloadUrl).toMatch(/^\/api\/v1\/files\/access\//);
    expect(redis.set).toHaveBeenCalled();
  });

  test('rejects legacy complaint download for an unrelated admin', async () => {
    filesRepository.findUploadedFileById.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      entity_type: 'complaint_document',
      entity_id: 'complaint-1',
      original_name: 'evidence.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
      storage_path: '/tmp/evidence.pdf',
      created_at: '2026-04-06T10:00:00.000Z',
    });
    complaintsRepository.getComplaintById.mockResolvedValue({
      id: 'complaint-1',
      assignedAdminUserId: 'admin-2',
      status: 'assigned',
    });

    await expect(
      filesService.createLegacyDownloadAccess({
        fileId: '11111111-1111-1111-1111-111111111111',
        actorRole: 'admin',
        actorId: 'admin-1',
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('persists metadata after confirming an uploaded object', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      s3Key: 'citizen/citizen-1/file.pdf',
      uploadedBy: 'citizen-1',
      uploaderRole: 'citizen',
      visibleToRole: 'admin',
      originalName: 'file.pdf',
      mimeType: 'application/pdf',
      fileCategory: 'document',
      size: 1024,
      contextType: 'general',
      contextId: null,
    }));
    filesRepository.findFileByS3Key.mockResolvedValue(null);
    storageService.headObject.mockResolvedValue({
      ContentLength: 1024,
      ContentType: 'application/pdf',
    });
    filesRepository.createFile.mockResolvedValue({
      id: 'file-1',
      s3_key: 'citizen/citizen-1/file.pdf',
      uploaded_by: 'citizen-1',
      uploader_role: 'citizen',
      visible_to_role: 'admin',
      original_name: 'file.pdf',
      mime_type: 'application/pdf',
      file_category: 'document',
      size: 1024,
      context_type: 'general',
      context_id: null,
      status: 'pending',
      created_at: '2026-04-05T00:00:00.000Z',
    });

    const result = await filesService.confirmUpload({
      actorRole: 'citizen',
      actorId: 'citizen-1',
      body: { s3Key: 'citizen/citizen-1/file.pdf' },
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
    });

    expect(filesRepository.createFile).toHaveBeenCalledWith(expect.objectContaining({
      s3Key: 'citizen/citizen-1/file.pdf',
      mimeType: 'application/pdf',
    }));
    expect(result.file.id).toBe('file-1');
  });

  test('rejects unauthorized file viewing', async () => {
    filesRepository.findFileRecordById.mockResolvedValue({
      id: 'file-1',
      s3_key: 'deo/deo-1/video.mp4',
      uploaded_by: 'deo-1',
      uploader_role: 'deo',
      visible_to_role: 'minister',
      original_name: 'video.mp4',
      mime_type: 'video/mp4',
      file_category: 'video',
      size: 1024,
      context_type: 'meeting',
      context_id: 'meeting-1',
      status: 'pending',
      created_at: '2026-04-05T00:00:00.000Z',
    });
    filesRepository.hasMinisterMeetingAccess.mockResolvedValue(false);

    await expect(
      filesService.createDownloadUrl({
        fileId: 'file-1',
        actorRole: 'minister',
        actorId: 'minister-1',
        reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
