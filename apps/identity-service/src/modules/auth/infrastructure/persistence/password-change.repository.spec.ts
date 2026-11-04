import type { DataSource } from 'typeorm';

import { AuthFailure } from '@/modules/auth/domain';
import { TypeormPasswordChangeRepository } from '@/modules/auth/infrastructure/persistence';
import { AuthSession } from '@/modules/auth/infrastructure/persistence/auth-session.entity';
import { RefreshToken } from '@/modules/auth/infrastructure/persistence/refresh-token.entity';
import { User } from '@/modules/users/infrastructure/persistence';

describe('TypeormPasswordChangeRepository', () => {
  function createRepository(
    options: { hash?: string; currentSession?: boolean; userStatus?: string } = {},
  ) {
    const user = {
      id: 'user-1',
      passwordHash: options.hash ?? 'old-hash',
      status: options.userStatus ?? 'ACTIVE',
      deletedAt: null,
    };
    const userLock = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const sessionLock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue(options.currentSession === false ? null : { id: 'session-current' }),
    };
    const userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(userLock),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const sessionRepository = { createQueryBuilder: jest.fn().mockReturnValue(sessionLock) };
    const updateBuilders = [AuthSession, RefreshToken].map(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    const updates = [...updateBuilders];
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) return userRepository;
        if (entity === AuthSession) return sessionRepository;
        throw new Error('Unexpected repository');
      }),
      createQueryBuilder: jest.fn(() => updates.shift()),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (transactionManager: typeof manager) => Promise<unknown>) =>
        work(manager),
      ),
    };
    return {
      repository: new TypeormPasswordChangeRepository(dataSource as unknown as DataSource),
      dataSource,
      userRepository,
      userLock,
      sessionLock,
      updateBuilders,
      manager,
    };
  }

  it('updates the password and revokes every family except the current one in one transaction', async () => {
    const { repository, dataSource, userRepository, sessionLock, updateBuilders } =
      createRepository();

    await expect(
      repository.changePasswordAndRevokeOtherSessions(
        'user-1',
        'session-current',
        'old-hash',
        'new-hash',
      ),
    ).resolves.toBe(true);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(userRepository.update).toHaveBeenCalledWith('user-1', { passwordHash: 'new-hash' });
    expect(sessionLock.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(updateBuilders[0]?.update).toHaveBeenCalledWith(AuthSession);
    expect(updateBuilders[0]?.where).toHaveBeenCalledWith(
      'user_id = :userId AND id <> :sessionId AND revoked_at IS NULL',
      { userId: 'user-1', sessionId: 'session-current' },
    );
    expect(updateBuilders[1]?.update).toHaveBeenCalledWith(RefreshToken);
    expect(updateBuilders[1]?.where).toHaveBeenCalledWith(
      'user_id = :userId AND family_id <> :sessionId AND revoked_at IS NULL',
      { userId: 'user-1', sessionId: 'session-current' },
    );
  });

  it.each([{ hash: 'newer-hash' }, { currentSession: false }])(
    'does not update when the credential or current session is no longer valid',
    async (options) => {
      const { repository, userRepository } = createRepository(options);

      await expect(
        repository.changePasswordAndRevokeOtherSessions(
          'user-1',
          'session-current',
          'old-hash',
          'new-hash',
        ),
      ).resolves.toBe(false);
      expect(userRepository.update).not.toHaveBeenCalled();
    },
  );

  it('does not change the password for a non-active account', async () => {
    const { repository, userRepository } = createRepository({ userStatus: 'LOCKED' });

    await expect(
      repository.changePasswordAndRevokeOtherSessions(
        'user-1',
        'session-current',
        'old-hash',
        'new-hash',
      ),
    ).resolves.toBe(false);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('maps persistence failures to the authentication dependency error', async () => {
    const dataSource = {
      transaction: jest.fn().mockRejectedValue(new Error('database unavailable')),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockRejectedValue(new Error('database unavailable')),
        }),
      }),
    };
    const repository = new TypeormPasswordChangeRepository(dataSource as unknown as DataSource);

    await expect(repository.findPasswordHash('user-1')).rejects.toEqual(
      new AuthFailure('dependency_unavailable'),
    );
    await expect(
      repository.changePasswordAndRevokeOtherSessions(
        'user-1',
        'session-current',
        'old-hash',
        'new-hash',
      ),
    ).rejects.toEqual(new AuthFailure('dependency_unavailable'));
  });
});
