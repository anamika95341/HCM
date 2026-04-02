jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../modules/meetings/meetings.repository', () => ({
  createUploadedFile: jest.fn(),
  createMeeting: jest.fn(),
  getMeetingById: jest.fn(),
}));

jest.mock('../modules/complaints/complaints.repository', () => ({
  createComplaint: jest.fn(),
  getComplaintById: jest.fn(),
}));

jest.mock('../modules/admin/admin.repository', () => ({
  listActiveAdminsForCitizenDirectory: jest.fn(),
  findActiveDeoById: jest.fn(),
  findActiveMinisterById: jest.fn(),
}));

jest.mock('../middleware/uploadHandler', () => ({
  persistPrivateUpload: jest.fn(),
  PHOTO_ALLOWED: new Set(['image/jpeg', 'image/png']),
}));

jest.mock('../utils/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../realtime/wsPublisher', () => ({
  publishMeetingStatusUpdate: jest.fn(),
  publishComplaintStatusUpdate: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const redis = require('../config/redis');
const pool = require('../config/database');
const meetingsRepository = require('../modules/meetings/meetings.repository');
const complaintsRepository = require('../modules/complaints/complaints.repository');
const meetingsService = require('../modules/meetings/meetings.service');
const complaintsService = require('../modules/complaints/complaints.service');

describe('submission workflow services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('meeting submission works without an idempotency header when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'idempo-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    meetingsRepository.createMeeting.mockResolvedValue({ id: 'meeting-db-1' });
    meetingsRepository.getMeetingById.mockResolvedValue({ id: 'meeting-db-1', requestId: 'MREQ-2026-000001', status: 'pending' });

    const result = await meetingsService.submitMeetingRequest({
      citizenId: 'citizen-1',
      body: {
        title: 'Water issue',
        purpose: 'Need to discuss water supply concerns in my area.',
        preferredTime: '2026-04-05T10:00:00.000Z',
        adminReferral: '',
        additionalAttendees: [],
      },
      file: null,
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      idempotencyKey: '',
    });

    expect(meetingsRepository.createMeeting).toHaveBeenCalledWith(expect.objectContaining({
      citizenId: 'citizen-1',
      title: 'Water issue',
    }));
    expect(result).toEqual({
      meeting: { id: 'meeting-db-1', requestId: 'MREQ-2026-000001', status: 'pending' },
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO idempotency_requests'),
      expect.arrayContaining(['meeting_submission', 'citizen-1'])
    );
  });

  test('complaint submission works without an idempotency header when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'idempo-2' }] })
      .mockResolvedValueOnce({ rows: [] });
    complaintsRepository.createComplaint.mockResolvedValue({ id: 'complaint-db-1' });
    complaintsRepository.getComplaintById.mockResolvedValue({ id: 'complaint-db-1', complaintId: 'COMP-2026-000001', status: 'submitted' });

    const result = await complaintsService.submitComplaint({
      citizenId: 'citizen-1',
      body: {
        subject: 'Street light issue',
        description: 'The main street light near the market has been out for two weeks.',
        complaintLocation: 'Main Market',
        complaintType: 'Civic',
      },
      file: null,
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      idempotencyKey: '',
    });

    expect(complaintsRepository.createComplaint).toHaveBeenCalledWith(expect.objectContaining({
      citizenId: 'citizen-1',
      subject: 'Street light issue',
    }));
    expect(result).toEqual({
      complaint: { id: 'complaint-db-1', complaintId: 'COMP-2026-000001', status: 'submitted' },
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO idempotency_requests'),
      expect.arrayContaining(['complaint_submission', 'citizen-1'])
    );
  });
});
