jest.mock('../modules/meetings/meetings.repository', () => ({
  getCitizenMeetingById: jest.fn(),
  getMeetingHistory: jest.fn(),
}));

jest.mock('../modules/complaints/complaints.repository', () => ({
  getCitizenComplaintById: jest.fn(),
  getComplaintHistory: jest.fn(),
  getCitizenComplaints: jest.fn(),
}));

jest.mock('../modules/citizen/citizen.repository', () => ({
  findCitizenById: jest.fn(),
}));

jest.mock('../modules/admin/admin.repository', () => ({
  listActiveAdminsForCitizenDirectory: jest.fn(),
}));

jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  publish: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../queues/index', () => ({
  enqueue: jest.fn(),
  JOBS: {
    SEND_EMAIL: 'sendEmail',
    SEND_SMS: 'sendSms',
    SEND_EMAIL_BATCH: 'sendEmailBatch',
  },
  buildJobId: jest.fn(() => 'job-id'),
}));

jest.mock('../modules/files/files.service', () => ({
  createLegacyDownloadAccess: jest.fn(),
  listOwnedFiles: jest.fn(),
}));

const meetingsRepository = require('../modules/meetings/meetings.repository');
const complaintsRepository = require('../modules/complaints/complaints.repository');
const filesService = require('../modules/files/files.service');
const citizenService = require('../modules/citizen/citizen.service');
const complaintsService = require('../modules/complaints/complaints.service');
const meetingsService = require('../modules/meetings/meetings.service');

describe('public endpoint propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    filesService.listOwnedFiles.mockResolvedValue([]);
    filesService.createLegacyDownloadAccess.mockResolvedValue({
      file: { id: 'legacy-file' },
      downloadUrl: '/api/v1/files/access/legacy-file?token=abc',
    });
  });

  test('citizen case detail forwards reqMeta to owned file signing', async () => {
    meetingsRepository.getCitizenMeetingById.mockResolvedValue({
      id: 'meeting-1',
      document_file_id: null,
    });
    meetingsRepository.getMeetingHistory.mockResolvedValue([]);

    await citizenService.getCaseDetail('citizen-1', 'meeting-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });

  test('citizen complaint detail forwards reqMeta to owned file signing', async () => {
    complaintsRepository.getCitizenComplaintById.mockResolvedValue({
      id: 'complaint-1',
      document_file_id: null,
    });
    complaintsRepository.getComplaintHistory.mockResolvedValue([]);

    await complaintsService.getCitizenComplaintDetail('complaint-1', 'citizen-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });

  test('citizen meeting detail forwards reqMeta to owned file signing', async () => {
    meetingsRepository.getCitizenMeetingById.mockResolvedValue({
      id: 'meeting-1',
      document_file_id: null,
    });
    meetingsRepository.getMeetingHistory.mockResolvedValue([]);

    await meetingsService.getCitizenMeetingDetail('meeting-1', 'citizen-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });
});
