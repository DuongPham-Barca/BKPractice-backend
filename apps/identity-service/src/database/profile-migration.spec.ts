import type { QueryRunner } from 'typeorm';

import { AddProfileValidationConstraints1700000000002 } from '@/database/migrations/1700000000002-AddProfileValidationConstraints';

describe('Profile validation migration', () => {
  const migration = new AddProfileValidationConstraints1700000000002();

  it('rejects legacy invalid data before changing the schema', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'legacy-profile' }]);
    await expect(migration.up({ query } as unknown as QueryRunner)).rejects.toThrow('remediation');
    expect(query).toHaveBeenCalledTimes(1);
    expect((query.mock.calls as unknown as string[][])[0]?.[0]).toContain('avatar_url');
  });

  it('adds and removes named checks without recreating the profile table', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const runner = { query } as unknown as QueryRunner;
    await migration.up(runner);
    await migration.down(runner);
    expect((query.mock.calls as unknown as string[][]).map(([statement]) => statement)).toEqual([
      expect.stringContaining('SELECT id FROM profiles'),
      expect.stringContaining('ADD CONSTRAINT "CHK_profiles_display_name"'),
      expect.stringContaining('ADD CONSTRAINT "CHK_profiles_bio_length"'),
      expect.stringContaining('DROP CONSTRAINT "CHK_profiles_bio_length"'),
      expect.stringContaining('DROP CONSTRAINT "CHK_profiles_display_name"'),
    ]);
  });
});
