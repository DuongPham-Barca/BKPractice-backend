import type { UserAdminProjection } from '@/modules/users/domain';

export const USER_MANAGEMENT_REPOSITORY = Symbol('UserManagementRepository');

export interface UserManagementRepository {
  list(page: number, limit: number, includeDeleted: boolean): Promise<{
    items: UserAdminProjection[];
    hasMore: boolean;
  }>;
  find(userId: string): Promise<UserAdminProjection | null>;
  softDelete(userId: string): Promise<void>;
}
