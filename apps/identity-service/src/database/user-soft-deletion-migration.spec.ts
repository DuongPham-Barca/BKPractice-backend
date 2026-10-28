import type { QueryRunner } from 'typeorm';

import { AddUserSoftDeletion1700000000007 } from '@/database/migrations/1700000000007-AddUserSoftDeletion';

describe('User soft-deletion migration', () => {
  it('adds the marker and refuses rollback while deleted users exist', async () => {
    const query = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce([{ '?column?': 1 }]);
    const runner = { query } as unknown as QueryRunner;
    const migration = new AddUserSoftDeletion1700000000007();
    await migration.up(runner);
    await expect(migration.down(runner)).rejects.toThrow('requires remediation');
    expect(query).not.toHaveBeenCalledWith('ALTER TABLE users DROP COLUMN deleted_at');
  });
});
