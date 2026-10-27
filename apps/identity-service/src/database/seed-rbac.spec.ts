import { describeSeedFailure } from '@/database/seed-rbac';

describe('RBAC seed diagnostics', () => {
  it.each([
    ['Invalid SEED_ADMIN_LOGIN_ID', 'Missing or invalid SEED_ADMIN_LOGIN_ID.'],
    ['Invalid SEED_ADMIN_EMAIL', 'Missing or invalid SEED_ADMIN_EMAIL.'],
    ['Invalid SEED_ADMIN_PASSWORD', 'Missing or invalid SEED_ADMIN_PASSWORD.'],
    [
      'Bootstrap administrator conflicts with an existing account',
      'Bootstrap Admin login or email conflicts with an existing account.',
    ],
  ])('reports a safe reason for %s', (reason, expected) => {
    expect(describeSeedFailure(new Error(reason))).toBe(expected);
  });

  it('points to the Identity migration when the schema is old', () => {
    expect(describeSeedFailure({ driverError: { code: '42703' } })).toContain(
      'pnpm migration:run:identity',
    );
    expect(
      describeSeedFailure({
        driverError: { code: '42703', message: 'column "is_system_account" does not exist' },
      }),
    ).toContain('users.is_system_account');
    expect(
      describeSeedFailure({
        driverError: { code: '42P01', message: 'relation "roles" does not exist' },
      }),
    ).toContain('table roles');
    expect(
      describeSeedFailure({
        driverError: { code: '42P01', message: 'relation "private-value" does not exist' },
      }),
    ).not.toContain('private-value');
  });

  it('never prints an unknown database error or credential', () => {
    expect(describeSeedFailure(new Error('password=private-value'))).not.toContain('private-value');
    expect(
      describeSeedFailure({ driverError: { code: '28P01', detail: 'private-value' } }),
    ).not.toContain('private-value');
  });
});
