const { adminRegistrationSchema } = require('../validators/admin.validator');
const { generateVerhoeffDigit } = require('../utils/aadhaar');

function buildValidAadhaar(prefix = '23412341235') {
  return `${prefix}${generateVerhoeffDigit(prefix)}`;
}

describe('admin validation', () => {
  test('rejects mismatched passwords', () => {
    const result = adminRegistrationSchema.safeParse({
      registrationToken: 'x'.repeat(32),
      username: 'admin.user',
      firstName: 'Admin',
      age: 40,
      sex: 'female',
      designation: 'Officer',
      aadhaarNumber: buildValidAadhaar(),
      phoneNumber: '9876543211',
      email: 'admin@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123',
    });

    expect(result.success).toBe(false);
  });
});
