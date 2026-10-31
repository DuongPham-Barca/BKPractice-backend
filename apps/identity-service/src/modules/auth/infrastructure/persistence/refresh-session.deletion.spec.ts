import type { BkRefreshClaims } from '@app/contracts';
import type { DataSource } from 'typeorm';

import type { PasswordHasher } from '@/modules/auth/application';
import { TypeormRefreshSessionRepository } from '@/modules/auth/infrastructure/persistence/refresh-session.repository';

describe('Session creation after soft deletion', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const record = {
    userId, familyId: '00000000-0000-0000-0000-000000000002',
    tokenId: '00000000-0000-0000-0000-000000000003',
    tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000),
  };
  const hasher: PasswordHasher = {
    hash: async () => 'hash', verify: async () => true, verifyDummy: async () => undefined,
  };

  it('does not insert a session when the User lock lookup excludes a deleted account', async () => {
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({ createQueryBuilder: () => query }),
      insert: jest.fn(),
    };
    const database = { transaction: async (work: (transactionManager: typeof manager) => Promise<unknown>) => work(manager) };
    const sessions = new TypeormRefreshSessionRepository(database as unknown as DataSource, hasher);
    await expect(sessions.create(record)).rejects.toThrow('invalid_credentials');
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_read');
    expect(query.where).toHaveBeenCalledWith('user.id = :userId AND user.deletedAt IS NULL', { userId });
    expect(manager.insert).not.toHaveBeenCalled();
    const claims = { sub: userId, fid: record.familyId, jti: record.tokenId } as BkRefreshClaims;
    expect(await sessions.rotate(claims, 'raw', record)).toBe(false);
  });

  it('rejects a password login that was verified before a concurrent reset', async () => {
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ status: 'ACTIVE', passwordHash: 'new-hash' }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({ createQueryBuilder: () => query }),
      insert: jest.fn(),
    };
    const database = { transaction: async (work: (transactionManager: typeof manager) => Promise<unknown>) => work(manager) };
    const sessions = new TypeormRefreshSessionRepository(database as unknown as DataSource, hasher);
    await expect(sessions.create({ ...record, expectedPasswordHash: 'old-hash' }))
      .rejects.toThrow('invalid_credentials');
    expect(manager.insert).not.toHaveBeenCalled();
  });
});
