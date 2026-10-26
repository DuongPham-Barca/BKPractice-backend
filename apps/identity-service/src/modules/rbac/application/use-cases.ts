import type {
  IdentityAccountContext,
  TransactionRunner,
  UserRoles,
} from '@/modules/rbac/application/ports';
import {
  type AuthorizationPrincipal,
  type AuthorizationDecision,
  RoleName,
  RbacFailure,
  evaluatePermission,
  requireAdmin,
  requireAnotherAdmin,
  requireAssignableRole,
  requireRevocableRole,
} from '@/modules/rbac/domain';

async function loadUserRoles(context: IdentityAccountContext, userId: string): Promise<UserRoles> {
  const result = await context.findUserRoles(userId);
  if (!result) throw new RbacFailure('user_not_found');
  return result;
}

export class GetUserRoles {
  constructor(private readonly accounts: IdentityAccountContext) {}

  execute(principal: AuthorizationPrincipal, userId: string): Promise<UserRoles> {
    requireAdmin(principal);
    return loadUserRoles(this.accounts, userId);
  }
}

export class AssignRoleToUser {
  constructor(private readonly transactions: TransactionRunner) {}

  execute(principal: AuthorizationPrincipal, userId: string, role: RoleName): Promise<UserRoles> {
    requireAdmin(principal);
    requireAssignableRole(role);
    return this.transactions.run(async (repository) => {
      await loadUserRoles(repository, userId);
      await repository.assignRole(userId, role);
      return loadUserRoles(repository, userId);
    });
  }
}

export class RevokeRoleFromUser {
  constructor(private readonly transactions: TransactionRunner) {}

  execute(principal: AuthorizationPrincipal, userId: string, role: RoleName): Promise<UserRoles> {
    requireAdmin(principal);
    requireRevocableRole(principal, userId, role);
    return this.transactions.run(async (repository) => {
      // Lock the same static row before counting so concurrent self-revocations serialize.
      if (role === RoleName.Admin) await repository.lockAdminRole();
      const current = await loadUserRoles(repository, userId);
      if (role === RoleName.Admin && current.roles.includes(RoleName.Admin)) {
        requireAnotherAdmin(await repository.countAdmins());
      }
      await repository.revokeRole(userId, role);
      return loadUserRoles(repository, userId);
    });
  }
}

export class EvaluateAuthorization {
  execute(
    principal: AuthorizationPrincipal,
    requiredPermission: string,
    resourceAllowed?: boolean,
  ): AuthorizationDecision {
    return evaluatePermission(principal, requiredPermission, resourceAllowed);
  }
}
