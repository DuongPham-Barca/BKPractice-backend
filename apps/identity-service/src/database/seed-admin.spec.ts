import { readSeedAdminConfig } from '@/database/seed-admin';

describe('bootstrap administrator configuration', () => {
  const configured = {
    SEED_ADMIN_LOGIN_ID: 'admin',
    SEED_ADMIN_EMAIL: 'Admin@Example.Invalid',
    SEED_ADMIN_PASSWORD: 'admin',
  };

  it('normalizes the technical email without changing the password', () => {
    expect(readSeedAdminConfig(configured)).toEqual({
      loginId: 'admin',
      email: 'admin@example.invalid',
      password: 'admin',
    });
  });

  it.each([
    { ...configured, SEED_ADMIN_LOGIN_ID: '' },
    { ...configured, SEED_ADMIN_LOGIN_ID: 'admin account' },
    { ...configured, SEED_ADMIN_EMAIL: 'invalid' },
    { ...configured, SEED_ADMIN_PASSWORD: '' },
  ])('rejects missing or invalid seed input', (input) => {
    expect(() => readSeedAdminConfig(input)).toThrow();
  });
});
