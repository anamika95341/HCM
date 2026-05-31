jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../modules/appointments/appointments.repository', () => ({
  createUploadedFile: jest.fn(),
  createAppointment: jest.fn(),
  getAppointmentById: jest.fn(),
}));

jest.mock('../modules/grievances/grievances.repository', () => ({
  createGrievance: jest.fn(),
  getGrievanceById: jest.fn(),
}));

jest.mock('../modules/admin/admin.repository', () => ({
  listActiveAdminsForCitizenDirectory: jest.fn(),
  findActiveAdminById: jest.fn(),
  findActiveDeoById: jest.fn(),
  findActiveMinisterById: jest.fn(),
  findChiefMinisterAdmin: jest.fn(),
}));

jest.mock('../middleware/uploadHandler', () => ({
  persistPrivateUpload: jest.fn(),
  PHOTO_ALLOWED: new Set(['image/jpeg', 'image/png']),
}));

jest.mock('../utils/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../realtime/wsPublisher', () => ({
  publishAppointmentStatusUpdate: jest.fn(),
  publishGrievanceStatusUpdate: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const redis = require('../config/redis');
const pool = require('../config/database');
const appointmentsRepository = require('../modules/appointments/appointments.repository');
const grievancesRepository = require('../modules/grievances/grievances.repository');
const adminRepository = require('../modules/admin/admin.repository');
const appointmentsService = require('../modules/appointments/appointments.service');
const grievancesService = require('../modules/grievances/grievances.service');

describe('submission workflow services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('appointment submission works without an idempotency header when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'idempo-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    appointmentsRepository.createAppointment.mockResolvedValue({ id: 'appointment-db-1' });
    appointmentsRepository.getAppointmentById.mockResolvedValue({ id: 'appointment-db-1', requestId: 'MREQ-2026-000001', status: 'pending' });

    const result = await appointmentsService.submitAppointmentRequest({
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

    expect(appointmentsRepository.createAppointment).toHaveBeenCalledWith(expect.objectContaining({
      citizenId: 'citizen-1',
      title: 'Water issue',
    }));
    expect(result).toEqual({
      appointment: { id: 'appointment-db-1', requestId: 'MREQ-2026-000001', status: 'pending' },
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO idempotency_requests'),
      expect.arrayContaining(['appointment_submission', 'citizen-1'])
    );
  });

  test('appointment submission assigns the selected admin desk directly to the appointment queue', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'idempo-3' }] })
      .mockResolvedValueOnce({ rows: [] });
    adminRepository.findActiveAdminById.mockResolvedValue({ id: 'admin-42' });
    appointmentsRepository.createAppointment.mockResolvedValue({ id: 'appointment-db-2' });
    appointmentsRepository.getAppointmentById.mockResolvedValue({ id: 'appointment-db-2', requestId: 'MREQ-2026-000002', status: 'pending', assignedAdminUserId: 'admin-42' });

    const result = await appointmentsService.submitAppointmentRequest({
      citizenId: 'citizen-1',
      body: {
        title: 'Local road repair',
        purpose: 'Need to discuss repeated road damage and drainage issues.',
        preferredTime: '2026-04-06T11:00:00.000Z',
        adminReferral: 'Admin Name · Roads',
        referralAdminUserId: 'admin-42',
        additionalAttendees: [],
      },
      file: null,
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      idempotencyKey: '',
    });

    expect(adminRepository.findActiveAdminById).toHaveBeenCalledWith('admin-42');
    expect(appointmentsRepository.createAppointment).toHaveBeenCalledWith(expect.objectContaining({
      citizenId: 'citizen-1',
      assignedAdminId: 'admin-42',
      adminReferral: 'Admin Name · Roads',
    }));
    expect(result).toEqual({
      appointment: { id: 'appointment-db-2', requestId: 'MREQ-2026-000002', status: 'pending', assignedAdminUserId: 'admin-42' },
    });
  });

  test('grievance submission works without an idempotency header when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'idempo-2' }] })
      .mockResolvedValueOnce({ rows: [] });
    adminRepository.findChiefMinisterAdmin.mockResolvedValue(null);
    grievancesRepository.createGrievance.mockResolvedValue({ id: 'grievance-db-1' });
    grievancesRepository.getGrievanceById.mockResolvedValue({ id: 'grievance-db-1', grievanceId: 'COMP-2026-000001', status: 'submitted' });

    const result = await grievancesService.submitGrievance({
      citizenId: 'citizen-1',
      body: {
        subject: 'Street light issue',
        description: 'The main street light near the market has been out for two weeks.',
        grievanceLocation: 'Main Market',
        grievanceType: 'Civic',
      },
      file: null,
      reqMeta: { ip: '127.0.0.1', userAgent: 'jest' },
      idempotencyKey: '',
    });

    expect(grievancesRepository.createGrievance).toHaveBeenCalledWith(expect.objectContaining({
      citizenId: 'citizen-1',
      subject: 'Street light issue',
    }));
    expect(result).toEqual({
      grievance: { id: 'grievance-db-1', grievanceId: 'COMP-2026-000001', status: 'submitted' },
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO idempotency_requests'),
      expect.arrayContaining(['grievance_submission', 'citizen-1'])
    );
  });
});
