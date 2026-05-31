const { appointmentRequestSchema } = require('../validators/citizen.validator');
const { appointmentScheduleSchema } = require('../validators/appointment.validator');

describe('appointment validators', () => {
  test('accepts a valid appointment request', () => {
    const result = appointmentRequestSchema.safeParse({
      title: 'Water supply issue',
      purpose: 'Need to discuss a constituency issue in detail.',
      preferredTime: '2026-03-25T10:30:00.000Z',
      adminReferral: '',
      additionalAttendees: [
        { attendeeName: 'Ravi Kumar', attendeePhone: '9876543210' },
      ],
    });

    expect(result.success).toBe(true);
  });

  test('rejects invalid schedule payload', () => {
    const result = appointmentScheduleSchema.safeParse({
      ministerId: 'not-a-uuid',
      startsAt: '2026-03-20T10:00:00.000Z',
      endsAt: '2026-03-20T11:00:00.000Z',
      location: 'Secretariat',
      isVip: true,
    });

    expect(result.success).toBe(false);
  });
});
