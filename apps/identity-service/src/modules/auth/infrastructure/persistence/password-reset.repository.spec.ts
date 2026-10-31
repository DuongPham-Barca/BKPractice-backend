import { createHash, createHmac } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

import type { PasswordHasher } from '@/modules/auth/application/ports';
import { PasswordResetFailure } from '@/modules/auth/domain';
import {
  PasswordResetChallenge,
  PasswordResetGrant,
  TypeormPasswordResetRepository,
} from '@/modules/auth/infrastructure/persistence';
import { User } from '@/modules/users/infrastructure/persistence';

describe('TypeormPasswordResetRepository', () => {
  const user = {
    id: 'user-1',
    email: 'student@school.edu',
    status: 'ACTIVE',
    isSystemAccount: false,
    deletedAt: null,
    passwordHash: 'old-hash',
    roles: [{ name: 'STUDENT' }],
  };

  function createRepository(samePassword = false) {
    const userLock = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const userRoles = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    const userUpdate = jest.fn().mockResolvedValue(undefined);
    const users = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(userLock).mockReturnValueOnce(userRoles),
      update: userUpdate,
    };
    const grantLock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        tokenHash: 'stored-hash',
        userId: user.id,
        expiresAt: new Date(Date.now() + 300_000),
      }),
    };
    const grantDelete = jest.fn().mockResolvedValue(undefined);
    const grantSave = jest.fn().mockResolvedValue(undefined);
    const grants = {
      createQueryBuilder: jest.fn().mockReturnValue(grantLock),
      delete: grantDelete,
      save: grantSave,
    };
    const challengeLock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    const challengeSave = jest
      .fn<Promise<void>, [Partial<PasswordResetChallenge>]>()
      .mockResolvedValue(undefined);
    const challenges = {
      createQueryBuilder: jest.fn().mockReturnValue(challengeLock),
      save: challengeSave,
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const execute = jest.fn().mockResolvedValue(undefined);
    const updates = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) return users;
        if (entity === PasswordResetGrant) return grants;
        if (entity === PasswordResetChallenge) return challenges;
        throw new Error('Unexpected repository');
      }),
      createQueryBuilder: jest.fn().mockReturnValue(updates),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (transactionManager: typeof manager) => Promise<unknown>) =>
        work(manager),
      ),
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === PasswordResetGrant) return grants;
        if (entity === PasswordResetChallenge) return challenges;
        throw new Error('Unexpected repository');
      }),
    };
    const hasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
      verify: jest.fn().mockResolvedValue(samePassword),
      verifyDummy: jest.fn(),
    } as jest.Mocked<PasswordHasher>;
    const config = new ConfigService({ JWT_REFRESH_SECRET: 'r'.repeat(32) });
    return {
      repository: new TypeormPasswordResetRepository(
        dataSource as unknown as DataSource,
        hasher,
        config,
      ),
      dataSource,
      userLock,
      userUpdate,
      grantDelete,
      grantSave,
      grantLock,
      challengeLock,
      challengeSave,
      updates,
      execute,
      hasher,
    };
  }

  it('consumes the grant only after updating password and revoking sessions in one transaction', async () => {
    const {
      repository,
      dataSource,
      userLock,
      userUpdate,
      grantDelete,
      grantLock,
      updates,
      hasher,
    } = createRepository();
    await expect(repository.resetPasswordWithGrant('reset-token', 'new-password')).resolves.toBe(
      true,
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(grantLock.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(userLock.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(hasher.verify).toHaveBeenCalledWith('old-hash', 'new-password');
    expect(userUpdate).toHaveBeenCalledWith('user-1', { passwordHash: 'new-hash' });
    expect(updates.update).toHaveBeenCalledTimes(2);
    expect(grantDelete).toHaveBeenCalledWith({
      tokenHash: createHash('sha256').update('reset-token').digest('hex'),
    });
  });

  it('keeps the grant when the new password matches the current password', async () => {
    const { repository, userUpdate, grantDelete, execute } = createRepository(true);
    await expect(repository.resetPasswordWithGrant('reset-token', 'old-password')).resolves.toBe(
      false,
    );
    expect(userUpdate).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(grantDelete).not.toHaveBeenCalled();
  });

  it('invalidates an OTP after the fifth wrong attempt without creating a grant', async () => {
    const { repository, challengeLock, challengeSave } = createRepository();
    const challenge = {
      userId: user.id,
      otpHash: createHmac('sha256', 'r'.repeat(32)).update(`${user.email}:123456`).digest('hex'),
      expiresAt: new Date(Date.now() + 300_000),
      resendAt: new Date(Date.now() + 60_000),
      failedAttempts: 4,
    };
    challengeLock.getOne.mockResolvedValue(challenge);
    await expect(
      repository.verifyOtp(user.id, user.email, '654321', 'reset-token'),
    ).resolves.toBeNull();
    expect(challengeSave).toHaveBeenCalledWith(
      expect.objectContaining({ failedAttempts: 5, otpHash: null }),
    );
  });

  it('stores only an OTP HMAC and refuses a request during cooldown', async () => {
    const { repository, challengeLock, challengeSave } = createRepository();
    challengeLock.getOne.mockResolvedValueOnce(null);
    await expect(repository.issueOtp(user.id, user.email, '123456')).resolves.toBe(true);
    const stored = challengeSave.mock.calls[0]?.[0];
    expect(stored?.otpHash).toBe(
      createHmac('sha256', 'r'.repeat(32)).update(`${user.email}:123456`).digest('hex'),
    );
    expect(stored?.otpHash).not.toBe('123456');
    expect(stored?.expiresAt?.getTime()).toBeGreaterThan(stored?.resendAt?.getTime() ?? 0);
    const {
      repository: cooldownRepository,
      challengeLock: cooldownLock,
      challengeSave: cooldownSave,
    } = createRepository();
    cooldownLock.getOne.mockResolvedValue({ resendAt: new Date(Date.now() + 60_000) });
    await expect(cooldownRepository.issueOtp(user.id, user.email, '654321')).resolves.toBe(false);
    expect(cooldownSave).not.toHaveBeenCalled();
  });

  it('consumes a valid OTP and stores only a hash of the grant', async () => {
    const { repository, challengeLock, challengeSave, grantSave } = createRepository();
    const challenge = {
      userId: user.id,
      otpHash: createHmac('sha256', 'r'.repeat(32)).update(`${user.email}:123456`).digest('hex'),
      expiresAt: new Date(Date.now() + 300_000),
      resendAt: new Date(Date.now() + 60_000),
      failedAttempts: 0,
    };
    challengeLock.getOne.mockResolvedValue(challenge);
    await expect(repository.verifyOtp(user.id, user.email, '123456', 'reset-token')).resolves.toBe(
      user.id,
    );
    expect(challengeSave).toHaveBeenCalledWith(expect.objectContaining({ otpHash: null }));
    expect(grantSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: createHash('sha256').update('reset-token').digest('hex'),
        userId: user.id,
      }),
    );
  });

  it('maps a database failure to a generic dependency error', async () => {
    const { repository, dataSource } = createRepository();
    dataSource.transaction.mockRejectedValueOnce(new Error('database offline'));
    await expect(repository.resetPasswordWithGrant('reset-token', 'new-password')).rejects.toEqual(
      new PasswordResetFailure('dependency_unavailable'),
    );
  });

  it('checks both reset tables before any account lookup', async () => {
    const { repository, dataSource } = createRepository();
    await repository.assertAvailable();
    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      'SELECT 1 FROM password_reset_challenges LIMIT 1',
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      'SELECT 1 FROM password_reset_grants LIMIT 1',
    );
  });
});
