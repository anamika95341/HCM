jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  publish: jest.fn(),
}));

jest.mock('../modules/meetings/meetings.repository', () => ({
  getMeetingById: jest.fn(),
  updateMeetingStatus: jest.fn(),
  getMeetingHistory: jest.fn(),
  createMeeting: jest.fn(),
  createUploadedFile: jest.fn(),
  getCitizenMeetings: jest.fn(),
  getCitizenMeetingById: jest.fn(),
  getMeetingQueue: jest.fn(),
  getAdminMeetingById: jest.fn(),
  createCalendarEvent: jest.fn(),
  updateCalendarEventByMeetingId: jest.fn(),
}));

jest.mock('../modules/complaints/complaints.repository', () => ({
  getComplaintById: jest.fn(),
  updateComplaintStatus: jest.fn(),
  getComplaintHistory: jest.fn(),
  createComplaint: jest.fn(),
  getCitizenComplaints: jest.fn(),
  getCitizenComplaintById: jest.fn(),
  getComplaintQueue: jest.fn(),
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
  publishMeetingStatusUpdate: jest.fn(),
  publishComplaintStatusUpdate: jest.fn(),
}));

const meetingsRepository = require('../modules/meetings/meetings.repository');
const complaintsRepository = require('../modules/complaints/complaints.repository');
const meetingsService = require('../modules/meetings/meetings.service');
const complaintsService = require('../modules/complaints/complaints.service');
const citizenService = require('../modules/citizen/citizen.service');

describe('workflow integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects DEO verification from a DEO who is not assigned to the meeting', async () => {
    meetingsRepository.getMeetingById.mockResolvedValue({
      id: 'meeting-1',
      citizen_id: 'citizen-1',
      status: 'verification_pending',
      assignedDeoId: 'deo-assigned',
    });

    await expect(
      meetingsService.submitVerification('meeting-1', 'deo-other', true, 'Looks valid', '', { ip: '127.0.0.1', userAgent: 'jest' })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(meetingsRepository.updateMeetingStatus).not.toHaveBeenCalled();
  });

  test('rejects scheduling a meeting while it is pending DEO verification', async () => {
    meetingsRepository.getMeetingById.mockResolvedValue({
      id: 'meeting-2',
      citizen_id: 'citizen-1',
      status: 'verification_pending',
      assignedAdminUserId: 'admin-1',
    });

    await expect(
      meetingsService.scheduleMeeting(
        'meeting-2',
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
    ).rejects.toMatchObject({ statusCode: 409, message: 'You cannot schedule this meeting as it is sent for DEO verification.' });

    expect(meetingsRepository.createCalendarEvent).not.toHaveBeenCalled();
    expect(meetingsRepository.updateMeetingStatus).not.toHaveBeenCalled();
  });

  test('rejects complaint workflow actions from an admin who does not own the complaint', async () => {
    complaintsRepository.getComplaintById.mockResolvedValue({
      id: 'complaint-1',
      status: 'assigned',
      citizen_id: 'citizen-1',
      assignedAdminUserId: 'admin-owner',
    });

    await expect(
      complaintsService.updateComplaintDepartment(
        'complaint-1',
        'admin-other',
        { department: 'Water', officerName: '', officerContact: '', manualContact: '' },
        { ip: '127.0.0.1', userAgent: 'jest' }
      )
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(complaintsRepository.updateComplaintStatus).not.toHaveBeenCalled();
  });

  test('citizen my-cases returns complaints only', async () => {
    complaintsRepository.getCitizenComplaints.mockResolvedValue([{ id: 'complaint-1' }]);

    const result = await citizenService.getMyCases('citizen-1');

    expect(result).toEqual({ complaints: [{ id: 'complaint-1' }] });
    expect(meetingsRepository.getCitizenMeetings).not.toHaveBeenCalled();
  });
});
