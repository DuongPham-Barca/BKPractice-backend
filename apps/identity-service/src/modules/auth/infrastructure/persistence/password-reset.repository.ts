import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, LessThanOrEqual } from 'typeorm';

import type {
  PasswordHasher,
  PasswordResetAccountRepository,
  PasswordResetStore,
} from '@/modules/auth/application/ports';
import { canResetPassword, PasswordResetFailure } from '@/modules/auth/domain';
import { AuthSession } from '@/modules/auth/infrastructure/persistence/auth-session.entity';
import { PasswordResetChallenge } from '@/modules/auth/infrastructure/persistence/password-reset-challenge.entity';
import { PasswordResetGrant } from '@/modules/auth/infrastructure/persistence/password-reset-grant.entity';
import { RefreshToken } from '@/modules/auth/infrastructure/persistence/refresh-token.entity';
import { User } from '@/modules/users/infrastructure/persistence';

const otpLifetimeMs = 5 * 60_000;
const grantLifetimeMs = 5 * 60_000;
const resendDelayMs = 60_000;

@Injectable()
export class TypeormPasswordResetRepository
  implements PasswordResetAccountRepository, PasswordResetStore
{
  private readonly secret: string;
  private lastPrunedAt = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasher,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async assertAvailable(): Promise<void> {
    await this.run(async () => {
      await this.dataSource.query('SELECT 1 FROM password_reset_challenges LIMIT 1');
      await this.dataSource.query('SELECT 1 FROM password_reset_grants LIMIT 1');
      await this.pruneExpired();
    });
  }

  async findByEmail(email: string) {
    return this.run(async () => {
      const user = await this.dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .where('LOWER(BTRIM(user.email)) = :email AND user.deletedAt IS NULL', { email })
        .getOne();
      return user ? this.map(user) : null;
    });
  }

  async issueOtp(userId: string, email: string, otp: string): Promise<boolean> {
    return this.run(() =>
      this.dataSource.transaction(async (manager) => {
        if (!(await this.lockEligibleUser(manager, userId, email))) return false;
        const challenges = manager.getRepository(PasswordResetChallenge);
        const current = await challenges
          .createQueryBuilder('challenge')
          .setLock('pessimistic_write')
          .where('challenge.userId = :userId', { userId })
          .getOne();
        const now = new Date();
        if (current && current.resendAt > now) return false;
        await challenges.save({
          userId,
          otpHash: this.otpHash(email, otp),
          expiresAt: new Date(now.getTime() + otpLifetimeMs),
          resendAt: new Date(now.getTime() + resendDelayMs),
          failedAttempts: 0,
        });
        return true;
      }),
    );
  }

  async verifyOtp(
    userId: string,
    email: string,
    otp: string,
    resetToken: string,
  ): Promise<string | null> {
    return this.run(() =>
      this.dataSource.transaction(async (manager) => {
        if (!(await this.lockEligibleUser(manager, userId, email))) return null;
        const challenges = manager.getRepository(PasswordResetChallenge);
        const current = await challenges
          .createQueryBuilder('challenge')
          .setLock('pessimistic_write')
          .where('challenge.userId = :userId', { userId })
          .getOne();
        const now = new Date();
        if (!current?.otpHash || current.expiresAt <= now || current.failedAttempts >= 5)
          return null;
        const providedHash = this.otpHash(email, otp);
        if (
          !timingSafeEqual(Buffer.from(current.otpHash, 'hex'), Buffer.from(providedHash, 'hex'))
        ) {
          current.failedAttempts += 1;
          if (current.failedAttempts >= 5) current.otpHash = null;
          await challenges.save(current);
          return null;
        }
        current.otpHash = null;
        await challenges.save(current);
        await manager.getRepository(PasswordResetGrant).save({
          tokenHash: this.grantHash(resetToken),
          userId,
          expiresAt: new Date(now.getTime() + grantLifetimeMs),
        });
        return userId;
      }),
    );
  }

  async resetPasswordWithGrant(resetToken: string, newPassword: string): Promise<boolean> {
    return this.run(() =>
      this.dataSource.transaction(async (manager) => {
        const tokenHash = this.grantHash(resetToken);
        const grant = await manager
          .getRepository(PasswordResetGrant)
          .createQueryBuilder('grant')
          .setLock('pessimistic_write')
          .where('grant.tokenHash = :tokenHash', { tokenHash })
          .getOne();
        if (!grant || grant.expiresAt <= new Date()) return false;
        const user = await this.lockEligibleUser(manager, grant.userId);
        if (!user || (await this.hasher.verify(user.passwordHash, newPassword))) return false;
        const passwordHash = await this.hasher.hash(newPassword);
        await manager.getRepository(User).update(user.id, { passwordHash });
        const now = new Date();
        await manager
          .createQueryBuilder()
          .update(AuthSession)
          .set({ revokedAt: now })
          .where('user_id = :userId AND revoked_at IS NULL', { userId: user.id })
          .execute();
        await manager
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: now })
          .where('user_id = :userId AND revoked_at IS NULL', { userId: user.id })
          .execute();
        await manager.getRepository(PasswordResetGrant).delete({ tokenHash });
        return true;
      }),
    );
  }

  private async lockEligibleUser(
    manager: EntityManager,
    userId: string,
    email?: string,
  ): Promise<User | null> {
    const user = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .setLock('pessimistic_write')
      .where('user.id = :userId AND user.deletedAt IS NULL', { userId })
      .getOne();
    if (!user || (email && user.email.trim().toLowerCase() !== email.trim().toLowerCase()))
      return null;
    const withRoles = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :userId', { userId })
      .getOne();
    return withRoles && canResetPassword(this.map(withRoles)) ? user : null;
  }

  private async pruneExpired(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastPrunedAt < 60_000) return;
    await this.dataSource
      .getRepository(PasswordResetGrant)
      .delete({ expiresAt: LessThanOrEqual(now) });
    await this.dataSource
      .getRepository(PasswordResetChallenge)
      .delete({ expiresAt: LessThanOrEqual(now) });
    this.lastPrunedAt = now.getTime();
  }

  private otpHash(email: string, otp: string): string {
    return createHmac('sha256', this.secret)
      .update(`${email.trim().toLowerCase()}:${otp}`)
      .digest('hex');
  }

  private grantHash(resetToken: string): string {
    return createHash('sha256').update(resetToken).digest('hex');
  }

  private map(user: User) {
    return {
      userId: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles.map((role) => role.name),
      isSystemAccount: user.isSystemAccount,
      deletedAt: user.deletedAt,
    };
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new PasswordResetFailure('dependency_unavailable');
    }
  }
}
