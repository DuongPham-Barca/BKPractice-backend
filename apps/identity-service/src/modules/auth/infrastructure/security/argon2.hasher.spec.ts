import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/security';

describe('Argon2PasswordHasher', () => {
  it('stores an Argon2 hash and verifies the exact Unicode password', async () => {
    const hasher = new Argon2PasswordHasher();
    const password = ' mật khẩu 123456 ';
    const hash = await hasher.hash(password);
    expect(hash).toMatch(/^\$argon2/);
    expect(hash).not.toContain(password);
    expect(await hasher.verify(hash, password)).toBe(true);
    expect(await hasher.verify(hash, password.trim())).toBe(false);
  });

  it('runs the dummy verification for an unknown student ID', async () => {
    const hasher = new Argon2PasswordHasher();
    await expect(hasher.verifyDummy('wrong')).resolves.toBeUndefined();
  });
});
