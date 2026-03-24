const { adminCreationSchema, deoCreationSchema } = require('../validators/admin.validator');

describe('admin validation', () => {
  test('rejects mismatched passwords', () => {
    const result = adminCreationSchema.safeParse({
      username: 'admin.user',
      firstName: 'Admin',
      age: 40,
      sex: 'female',
      designation: 'Officer',
      aadhaarNumber: '123456789012',
      phoneNumber: '9876543211',
      email: 'admin@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'PasswordMismatch001',
    });

    expect(result.success).toBe(false);
  });

  test('accepts a valid DEO creation payload', () => {
    const result = deoCreationSchema.safeParse({
      firstName: 'Deo',
      middleName: '',
      lastName: 'Officer',
      age: 31,
      sex: 'male',
      designation: 'Verification Officer',
      aadhaarNumber: '123456789013',
      phoneNumber: '9876543214',
      email: 'deo@example.com',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    });

    expect(result.success).toBe(true);
  });
});
