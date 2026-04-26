jest.mock('../modules/auth/auth.repository', () => ({
  findUserById: jest.fn(),
}));

jest.mock('../modules/notifications/notifications.repository', () => ({
  getPreferences: jest.fn(),
  createNotification: jest.fn(),
  countUnreadNotifications: jest.fn(),
}));

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn(),
}));

jest.mock('../utils/smsService', () => ({
  sendSms: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../queues/index', () => ({
  enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }),
  JOBS: {
    SEND_EMAIL: 'sendEmail',
    SEND_SMS: 'sendSms',
    SEND_EMAIL_BATCH: 'sendEmailBatch',
  },
  buildJobId: jest.fn(() => 'job-1'),
}));

jest.mock('../realtime/wsPublisher', () => ({
  publishMeetingStatusUpdate: jest.fn(),
  publishComplaintStatusUpdate: jest.fn(),
  publishNotificationCreated: jest.fn(),
}));

const authRepository = require('../modules/auth/auth.repository');
const notificationsRepository = require('../modules/notifications/notifications.repository');
const { enqueue, JOBS } = require('../queues/index');
const { publishNotificationCreated } = require('../realtime/wsPublisher');
const notificationsService = require('../modules/notifications/notifications.service');

describe('notifications service resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    notificationsRepository.getPreferences.mockResolvedValue(null);
    notificationsRepository.createNotification.mockResolvedValue({
      id: 'notification-1',
      eventType: 'meeting.scheduled',
      title: 'Meeting scheduled',
      body: 'A meeting was scheduled.',
    });
    notificationsRepository.countUnreadNotifications.mockResolvedValue(3);
    authRepository.findUserById.mockResolvedValue({
      id: 'minister-1',
      email: 'minister@example.gov.in',
      phone_number: '9999999999',
    });
  });

  test('notifyMinisterMeetingScheduled succeeds when email delivery fails', async () => {
    const result = await notificationsService.notifyMinisterMeetingScheduled({
      ministerId: 'minister-1',
      meetingId: 'meeting-1',
      meetingTitle: 'Budget review',
      scheduledAt: '2026-04-08T10:00:00.000Z',
      location: 'Secretariat',
      adminId: null,
      source: 'deo_calendar_event',
      entityType: 'minister_calendar_event',
    });

    expect(result).toHaveLength(1);
    expect(notificationsRepository.createNotification).toHaveBeenCalled();
    expect(publishNotificationCreated).toHaveBeenCalledWith(expect.objectContaining({
      recipientRole: 'minister',
      recipientId: 'minister-1',
      unreadCount: 3,
    }));
    expect(enqueue).toHaveBeenCalledWith(
      JOBS.SEND_EMAIL,
      expect.objectContaining({
        to: 'minister@example.gov.in',
        subject: expect.any(String),
        text: expect.any(String),
      }),
      expect.objectContaining({ jobId: 'job-1' }),
    );
  });
});
