import { evaluatePermission, RoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export interface UserAdminProjection {
  userId: string;
  studentId: string | null;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
  roles: string[];
  createdAt: Date;
  deletedAt: Date | null;
}

export class UserManagementFailure extends Error {
  constructor(readonly code: 'invalid' | 'not_found' | 'forbidden') {
    super(code);
  }
}

export function requireUserManagementPermission(
  principal: AuthorizationPrincipal,
  permission: 'user:read' | 'user:delete',
): void {
  if (!principal.roles.includes(RoleName.Admin) || !evaluatePermission(principal, permission).allowed)
    throw new UserManagementFailure('forbidden');
}
