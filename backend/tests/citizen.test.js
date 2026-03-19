const { citizenRegistrationSchema } = require('../validators/citizen.validator');
const { generateVerhoeffDigit } = require('../utils/aadhaar');

function buildValidAadhaar(prefix = '23412341234') {
  return `${prefix}${generateVerhoeffDigit(prefix)}`;
}

describe('citizen validation', () => {
  test('accepts a valid registration payload', () => {
    const result = citizenRegistrationSchema.safeParse({
      firstName: 'Aman',
      middleName: '',
      lastName: 'Singh',
      email: 'aman@example.com',
      aadhaarNumber: buildValidAadhaar(),
      age: 28,
      sex: 'male',
      mobileNumber: '9876543210',
      pincode: '110001',
      city: 'New Delhi',
      state: 'Delhi',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      preferredVerificationChannel: 'sms',
    });

    expect(result.success).toBe(true);
  });
});
