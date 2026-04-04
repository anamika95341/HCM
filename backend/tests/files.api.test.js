jest.mock('../middleware/authenticateAny', () => () => (req, res, next) => {
  const role = req.get('x-test-role');
  const userId = req.get('x-test-user-id');
  if (!role || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { role, sub: userId };
  return next();
});

jest.mock('../middleware/authenticate', () => () => (req, res, next) => {
  const role = req.get('x-test-role');
  const userId = req.get('x-test-user-id');
  if (!role || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { role, sub: userId };
  return next();
});

jest.mock('../middleware/rateLimiter', () => ({
  uploads: (req, res, next) => next(),
}));

jest.mock('../modules/files/files.service', () => ({
  createUploadUrl: jest.fn(),
  confirmUpload: jest.fn(),
  listFiles: jest.fn(),
  createDownloadUrl: jest.fn(),
  resolveSignedFileAccess: jest.fn(),
  createStorageDownloadUrl: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const filesRoutes = require('../modules/files/files.routes');
const errorHandler = require('../middleware/errorHandler');
const filesService = require('../modules/files/files.service');

describe('files API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/files', filesRoutes);
    app.use(errorHandler);
  });

  test('returns 401 when upload-url is called without auth', async () => {
    const response = await request(app)
      .post('/api/v1/files/upload-url')
      .send({
        fileName: 'note.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        contextType: 'general',
      });

    expect(response.status).toBe(401);
  });

  test('validates upload-url payload before service execution', async () => {
    const response = await request(app)
      .post('/api/v1/files/upload-url')
      .set('x-test-role', 'citizen')
      .set('x-test-user-id', 'citizen-1')
      .send({
        fileName: 'invalid.zip',
        mimeType: 'application/zip',
        size: 1024,
        contextType: 'general',
      });

    expect(response.status).toBe(400);
    expect(filesService.createUploadUrl).not.toHaveBeenCalled();
  });

  test('returns download URL for an authorized viewer', async () => {
    filesService.createDownloadUrl.mockResolvedValue({
      downloadUrl: 'http://download-url',
      expiresInSeconds: 90,
      file: { id: 'file-1' },
    });

    const response = await request(app)
      .get('/api/v1/files/11111111-1111-1111-1111-111111111111/download')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1');

    expect(response.status).toBe(200);
    expect(response.body.downloadUrl).toBe('http://download-url');
  });
});
