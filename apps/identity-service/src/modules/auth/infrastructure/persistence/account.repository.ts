import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthAccountRepository } from '@/modules/auth/application/ports';
import type { AuthAccount, LocalAuthAccount } from '@/modules/auth/domain';
import { User } from '@/modules/users/infrastructure/persistence';

function mapAccount(user: User): AuthAccount {
  return {
    userId: user.id,
    studentId: user.studentId,
    email: user.email,
    status: user.status,
    roles: user.roles.map((role) => role.name).sort(),
  };
}

@Injectable()
export class TypeormAuthAccountRepository implements AuthAccountRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async findByIdentifier(identifier: string): Promise<LocalAuthAccount | null> {
    const users = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where(
        '(user.studentId = :identifier OR (LOWER(BTRIM(user.email)) = :email AND user.isSystemAccount = false))',
        { identifier, email: identifier.toLowerCase() },
      )
      .take(2)
      .getMany();
    const user = users[0];
    if (users.length !== 1 || !user) return null;
    return { ...mapAccount(user), passwordHash: user.passwordHash };
  }

  async findById(userId: string): Promise<AuthAccount | null> {
    const user = await this.users.findOneBy({ id: userId });
    return user ? mapAccount(user) : null;
  }
}
