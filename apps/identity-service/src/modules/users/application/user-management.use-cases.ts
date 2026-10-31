import type { AuthorizationPrincipal } from '@/modules/rbac/domain';
import type { UserManagementRepository } from '@/modules/users/application/ports';
import {
  requireUserManagementPermission,
  UserManagementFailure,
  type UserAdminProjection,
} from '@/modules/users/domain';

export class UserManagementUseCases {
  constructor(private readonly users: UserManagementRepository) {}

  async listUsers(
    principal: AuthorizationPrincipal,
    page: number,
    limit: number,
    includeDeleted: boolean,
  ): Promise<{ items: UserAdminProjection[]; page: number; limit: number; hasMore: boolean }> {
    requireUserManagementPermission(principal, 'user:read');
    if (
      !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) ||
      limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)
    ) throw new UserManagementFailure('invalid');
    const result = await this.users.list(page, limit, includeDeleted);
    return { ...result, page, limit };
  }

  async getUser(principal: AuthorizationPrincipal, userId: string): Promise<UserAdminProjection> {
    requireUserManagementPermission(principal, 'user:read');
    const user = await this.users.find(userId);
    if (!user) throw new UserManagementFailure('not_found');
    return user;
  }

  async deleteUser(principal: AuthorizationPrincipal, userId: string): Promise<void> {
    requireUserManagementPermission(principal, 'user:delete');
    await this.users.softDelete(userId);
  }
}
