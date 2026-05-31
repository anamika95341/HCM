jest.mock('../modules/deo/deo.repository', () => ({
  getAssignedAppointments: jest.fn(),
  getCompletedAppointments: jest.fn(),
  listAppointmentFilesForDeo: jest.fn(),
  listActiveMinisters: jest.fn(),
  createCalendarEvent: jest.fn(),
  listCalendarEventsByDeo: jest.fn(),
}));

jest.mock('../modules/admin/admin.repository', () => ({
  findActiveMinisterById: jest.fn(),
}));

jest.mock('../modules/files/files.repository', () => ({
  listFilesUploadedByActor: jest.fn(),
  listFilesForContext: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../modules/notifications/notifications.service', () => ({
  notifyMinisterAppointmentScheduled: jest.fn(),
}));

jest.mock('../modules/files/files.service', () => ({
  listCitizenFilesForContext: jest.fn(),
}));

const deoRepository = require('../modules/deo/deo.repository');
const filesRepository = require('../modules/files/files.repository');
const deoService = require('../modules/deo/deo.service');

describe('deo service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns completed appointments for DEO regardless of prior DEO assignment', async () => {
    deoRepository.getCompletedAppointments.mockResolvedValue([
      {
        id: 'appointment-1',
        status: 'completed',
        assigned_deo_id: null,
        created_at: '2026-04-08T10:00:00.000Z',
      },
    ]);
    deoRepository.listAppointmentFilesForDeo.mockResolvedValue([]);
    filesRepository.listFilesForContext.mockResolvedValue([]);

    const result = await deoService.getCompletedAppointments('deo-1');

    expect(deoRepository.getCompletedAppointments).toHaveBeenCalledWith();
    expect(filesRepository.listFilesForContext).toHaveBeenCalledWith('deo', {
      contextType: 'appointment',
      contextId: 'appointment-1',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('appointment-1');
  });
});
