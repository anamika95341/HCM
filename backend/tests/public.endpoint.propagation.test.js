jest.mock('../modules/appointments/appointments.repository', () => ({
  getCitizenAppointmentById: jest.fn(),
  getAppointmentHistory: jest.fn(),
}));

jest.mock('../modules/grievances/grievances.repository', () => ({
  getCitizenGrievanceById: jest.fn(),
  getGrievanceHistory: jest.fn(),
  getCitizenGrievances: jest.fn(),
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

const appointmentsRepository = require('../modules/appointments/appointments.repository');
const grievancesRepository = require('../modules/grievances/grievances.repository');
const filesService = require('../modules/files/files.service');
const citizenService = require('../modules/citizen/citizen.service');
const grievancesService = require('../modules/grievances/grievances.service');
const appointmentsService = require('../modules/appointments/appointments.service');

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
    appointmentsRepository.getCitizenAppointmentById.mockResolvedValue({
      id: 'appointment-1',
      document_file_id: null,
    });
    appointmentsRepository.getAppointmentHistory.mockResolvedValue([]);

    await citizenService.getCaseDetail('citizen-1', 'appointment-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });

  test('citizen grievance detail forwards reqMeta to owned file signing', async () => {
    grievancesRepository.getCitizenGrievanceById.mockResolvedValue({
      id: 'grievance-1',
      document_file_id: null,
    });
    grievancesRepository.getGrievanceHistory.mockResolvedValue([]);

    await grievancesService.getCitizenGrievanceDetail('grievance-1', 'citizen-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });

  test('citizen appointment detail forwards reqMeta to owned file signing', async () => {
    appointmentsRepository.getCitizenAppointmentById.mockResolvedValue({
      id: 'appointment-1',
      document_file_id: null,
    });
    appointmentsRepository.getAppointmentHistory.mockResolvedValue([]);

    await appointmentsService.getCitizenAppointmentDetail('appointment-1', 'citizen-1', {
      publicEndpoint: 'https://portal.example.com',
    });

    expect(filesService.listOwnedFiles).toHaveBeenCalledWith(expect.objectContaining({
      reqMeta: expect.objectContaining({
        publicEndpoint: 'https://portal.example.com',
      }),
    }));
  });
});
