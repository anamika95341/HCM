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

jest.mock('../realtime/wsPublisher', () => ({
  publishMeetingStatusUpdate: jest.fn(),
  publishComplaintStatusUpdate: jest.fn(),
  publishNotificationCreated: jest.fn(),
}));

const authRepository = require('../modules/auth/auth.repository');
const notificationsRepository = require('../modules/notifications/notifications.repository');
const { sendMail } = require('../utils/mailer');
const logger = require('../utils/logger');
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
    sendMail.mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:1025'), {
      code: 'ESOCKET',
    }));

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
    expect(logger.warn).toHaveBeenCalledWith(
      'Notification email delivery failed',
      expect.objectContaining({
        recipientRole: 'minister',
        recipientId: 'minister-1',
        notificationId: 'notification-1',
        error: expect.objectContaining({ code: 'ESOCKET' }),
      }),
    );
  });
});
