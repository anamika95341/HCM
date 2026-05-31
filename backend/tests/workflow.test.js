jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  publish: jest.fn(),
}));

jest.mock('../modules/appointments/appointments.repository', () => ({
  getAppointmentById: jest.fn(),
  updateAppointmentStatus: jest.fn(),
  getAppointmentHistory: jest.fn(),
  createAppointment: jest.fn(),
  createUploadedFile: jest.fn(),
  getCitizenAppointments: jest.fn(),
  getCitizenAppointmentById: jest.fn(),
  getAppointmentQueue: jest.fn(),
  getAdminAppointmentById: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEventByAppointmentId: jest.fn(),
}));

jest.mock('../modules/grievances/grievances.repository', () => ({
  getGrievanceById: jest.fn(),
  updateGrievanceStatus: jest.fn(),
  getGrievanceHistory: jest.fn(),
  createGrievance: jest.fn(),
  getCitizenGrievances: jest.fn(),
  getCitizenGrievanceById: jest.fn(),
  getGrievanceQueue: jest.fn(),
}));

jest.mock('../modules/admin/admin.repository', () => ({
  listActiveAdminsForCitizenDirectory: jest.fn(),
  findActiveDeoById: jest.fn(),
  findActiveMinisterById: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../realtime/wsPublisher', () => ({
  publishAppointmentStatusUpdate: jest.fn(),
  publishGrievanceStatusUpdate: jest.fn(),
}));

const appointmentsRepository = require('../modules/appointments/appointments.repository');
const grievancesRepository = require('../modules/grievances/grievances.repository');
const appointmentsService = require('../modules/appointments/appointments.service');
const grievancesService = require('../modules/grievances/grievances.service');
const citizenService = require('../modules/citizen/citizen.service');

describe('workflow integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects DEO verification from a DEO who is not assigned to the appointment', async () => {
    appointmentsRepository.getAppointmentById.mockResolvedValue({
      id: 'appointment-1',
      citizen_id: 'citizen-1',
      status: 'verification_pending',
      assignedDeoId: 'deo-assigned',
    });

    await expect(
      appointmentsService.submitVerification('appointment-1', 'deo-other', true, 'Looks valid', '', { ip: '127.0.0.1', userAgent: 'jest' })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(appointmentsRepository.updateAppointmentStatus).not.toHaveBeenCalled();
  });

  test('rejects scheduling a appointment while it is pending DEO verification', async () => {
    appointmentsRepository.getAppointmentById.mockResolvedValue({
      id: 'appointment-2',
      citizen_id: 'citizen-1',
      status: 'verification_pending',
      assignedAdminUserId: 'admin-1',
    });

    await expect(
      appointmentsService.scheduleAppointment(
        'appointment-2',
        'admin-1',
        {
          ministerId: 'minister-1',
          startsAt: '2026-04-10T10:00:00.000Z',
          endsAt: '2026-04-10T11:00:00.000Z',
          location: 'Secretariat',
          isVip: false,
          comments: '',
        },
        { ip: '127.0.0.1', userAgent: 'jest' }
      )
    ).rejects.toMatchObject({ statusCode: 409, message: 'You cannot schedule this appointment as it is sent for DEO verification.' });

    expect(appointmentsRepository.createCalendarEvent).not.toHaveBeenCalled();
    expect(appointmentsRepository.updateAppointmentStatus).not.toHaveBeenCalled();
  });

  test('rejects grievance workflow actions from an admin who does not own the grievance', async () => {
    grievancesRepository.getGrievanceById.mockResolvedValue({
      id: 'grievance-1',
      status: 'assigned',
      citizen_id: 'citizen-1',
      assignedAdminUserId: 'admin-owner',
    });

    await expect(
      grievancesService.updateGrievanceDepartment(
        'grievance-1',
        'admin-other',
        { department: 'Water', officerName: '', officerContact: '', manualContact: '' },
        { ip: '127.0.0.1', userAgent: 'jest' }
      )
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(grievancesRepository.updateGrievanceStatus).not.toHaveBeenCalled();
  });

  test('citizen my-cases returns grievances only', async () => {
    grievancesRepository.getCitizenGrievances.mockResolvedValue([{ id: 'grievance-1' }]);

    const result = await citizenService.getMyCases('citizen-1');

    expect(result).toEqual({ grievances: [{ id: 'grievance-1' }] });
    expect(appointmentsRepository.getCitizenAppointments).not.toHaveBeenCalled();
  });
});
