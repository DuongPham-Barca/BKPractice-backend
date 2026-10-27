import { ForbiddenError } from '@learning/modules/problems/application/errors/forbidden.error';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import { Injectable } from '@nestjs/common';

export type OwnedProblemAction =
  'read-managed' | 'update' | 'publish' | 'hold' | 'republish' | 'delete' | 'restore';

const ACTION_PERMISSIONS: Record<OwnedProblemAction, string> = {
  'read-managed': 'problem:read-managed',
  update: 'problem:update',
  publish: 'problem:publish',
  hold: 'problem:hold',
  republish: 'problem:republish',
  delete: 'problem:delete',
  restore: 'problem:restore',
};

const LECTURER_ROLE = 'LECTURER';

@Injectable()
export class ProblemAuthorizationService {
  requireCreate(principal: Principal): void {
    this.requireLecturer(principal);
    this.requirePermission(principal, 'problem:create');
  }

  requireManagedList(principal: Principal): void {
    this.requireLecturer(principal);
    this.requirePermission(principal, 'problem:read-managed');
  }

  requireOwned(principal: Principal, problem: Problem, action: OwnedProblemAction): void {
    this.requireLecturer(principal);
    this.requirePermission(principal, ACTION_PERMISSIONS[action]);

    if (problem.createdBy.value !== principal.userId) {
      throw new ForbiddenError();
    }
  }

  private requireLecturer(principal: Principal): void {
    if (!principal.roles.includes(LECTURER_ROLE)) {
      throw new ForbiddenError();
    }
  }

  private requirePermission(principal: Principal, permission: string): void {
    if (!principal.permissions.includes(permission)) {
      throw new ForbiddenError();
    }
  }
}
