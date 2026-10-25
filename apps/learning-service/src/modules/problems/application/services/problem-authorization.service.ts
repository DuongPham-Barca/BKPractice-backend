import type { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import { PRINCIPAL_PROVIDER } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

import { ForbiddenError } from '../errors/forbidden.error';
import type { Principal } from '../models/principal';
import type { PrincipalProvider } from '../ports/out/principal-provider.port.out';

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
  constructor(
    @Inject(PRINCIPAL_PROVIDER)
    private readonly principalProvider: PrincipalProvider,
  ) {}

  async requirePublicRead(): Promise<Principal> {
    return this.principalProvider.getPrincipal();
  }

  async requireCreate(): Promise<Principal> {
    const principal = await this.principalProvider.getPrincipal();

    this.requireLecturer(principal);
    this.requirePermission(principal, 'problem:create');

    return principal;
  }

  async requireManagedList(): Promise<Principal> {
    const principal = await this.principalProvider.getPrincipal();

    this.requireLecturer(principal);
    this.requirePermission(principal, 'problem:read-managed');

    return principal;
  }

  async requireOwned(problem: Problem, action: OwnedProblemAction): Promise<Principal> {
    const principal = await this.principalProvider.getPrincipal();

    this.requireLecturer(principal);
    this.requirePermission(principal, ACTION_PERMISSIONS[action]);

    if (problem.createdBy.value !== principal.userId) {
      throw new ForbiddenError();
    }

    return principal;
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
