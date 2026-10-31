import type { AuthorizationPrincipal, RoleName } from '@/modules/rbac/domain';

export interface UserRoles {
  userId: string;
  roles: RoleName[];
}

export interface IdentityAccountContext {
  findUserRoles(userId: string): Promise<UserRoles | null>;
}

export interface RbacRepository extends IdentityAccountContext {
  assignRole(userId: string, role: RoleName): Promise<void>;
  revokeRole(userId: string, role: RoleName): Promise<void>;
  lockAdminRole(): Promise<void>;
  countAdmins(): Promise<number>;
}

export interface TransactionRunner {
  run<T>(operation: (repository: RbacRepository) => Promise<T>): Promise<T>;
}

export interface AuthorizationPrincipalProvider {
  verifyAccess(token: string): Promise<AuthorizationPrincipal>;
}

export const RBAC_REPOSITORY = Symbol('RbacRepository');
export const RBAC_TRANSACTION_RUNNER = Symbol('RbacTransactionRunner');
export const AUTHORIZATION_PRINCIPAL_PROVIDER = Symbol('AuthorizationPrincipalProvider');
