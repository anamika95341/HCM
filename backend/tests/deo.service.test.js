jest.mock('../modules/deo/deo.repository', () => ({
  getAssignedMeetings: jest.fn(),
  getCompletedMeetings: jest.fn(),
  listMeetingFilesForDeo: jest.fn(),
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
  notifyMinisterMeetingScheduled: jest.fn(),
}));

const deoRepository = require('../modules/deo/deo.repository');
const filesRepository = require('../modules/files/files.repository');
const deoService = require('../modules/deo/deo.service');

describe('deo service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns completed meetings for DEO regardless of prior DEO assignment', async () => {
    deoRepository.getCompletedMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        status: 'completed',
        assigned_deo_id: null,
        created_at: '2026-04-08T10:00:00.000Z',
      },
    ]);
    deoRepository.listMeetingFilesForDeo.mockResolvedValue([]);
    filesRepository.listFilesForContext.mockResolvedValue([]);

    const result = await deoService.getCompletedMeetings('deo-1');

    expect(deoRepository.getCompletedMeetings).toHaveBeenCalledWith();
    expect(filesRepository.listFilesForContext).toHaveBeenCalledWith('deo', {
      contextType: 'meeting',
      contextId: 'meeting-1',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('meeting-1');
  });
});
