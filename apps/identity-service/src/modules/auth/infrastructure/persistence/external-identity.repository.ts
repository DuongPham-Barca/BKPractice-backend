import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { ExternalIdentityRepository } from '@/modules/auth/application/ports';
import type { AuthAccount, MicrosoftIdentity } from '@/modules/auth/domain';
import { ExternalIdentity } from '@/modules/auth/infrastructure/persistence/external-identity.entity';
import { AccountStatus, User } from '@/modules/users/infrastructure/persistence';

function mapUser(user: User): AuthAccount {
  return {
    userId: user.id,
    studentId: user.studentId,
    email: user.email,
    status: user.status,
    roles: user.roles.map((role) => role.name).sort(),
  };
}

@Injectable()
export class TypeormExternalIdentityRepository implements ExternalIdentityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async resolveOrLink(identity: MicrosoftIdentity): Promise<AuthAccount | null> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const linked = await manager.findOne(ExternalIdentity, {
          where: {
            provider: 'MICROSOFT',
            providerTenantId: identity.tenantId,
            providerSubjectId: identity.objectId,
          },
        });
        if (linked) {
          const user = await manager.findOne(User, { where: { id: linked.userId } });
          return user ? mapUser(user) : null;
        }

        const matches = await manager
          .createQueryBuilder(User, 'user')
          .leftJoinAndSelect('user.roles', 'role')
          .where('LOWER(BTRIM(user.email)) = :email', { email: identity.username })
          .take(2)
          .getMany();
        const user = matches[0];
        if (matches.length !== 1 || !user || user.status !== AccountStatus.Active) return null;
        await manager.insert(ExternalIdentity, {
          userId: user.id,
          provider: 'MICROSOFT',
          providerTenantId: identity.tenantId,
          providerSubjectId: identity.objectId,
          providerUsernameAtLink: identity.username,
        });
        return mapUser(user);
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        return null;
      }
      throw error;
    }
  }
}
