import { ForbiddenError } from '@learning/modules/problems/application/errors/forbidden.error';
import type { Principal } from '@learning/modules/problems/application/models/principal';

import {
  ProblemAuthorizationService,
  type ManagedProblemAction,
} from './problem-authorization.service';

const ACTION_PERMISSIONS: Record<ManagedProblemAction, string> = {
  'read-managed': 'problem:read-managed',
  update: 'problem:update',
  publish: 'problem:publish',
  hold: 'problem:hold',
  republish: 'problem:republish',
  delete: 'problem:delete',
  restore: 'problem:restore',
};

describe('ProblemAuthorizationService', () => {
  const service = new ProblemAuthorizationService();

  it('allows an ADMIN with the exact permission', () => {
    for (const action of Object.keys(ACTION_PERMISSIONS) as ManagedProblemAction[]) {
      expect(() =>
        service.requireManaged(admin([ACTION_PERMISSIONS[action]]), action),
      ).not.toThrow();
    }
  });

  it('allows different ADMIN accounts to manage the same resource', () => {
    expect(() =>
      service.requireManaged(
        admin(['problem:update'], '00000000-0000-4000-8000-000000000041'),
        'update',
      ),
    ).not.toThrow();
  });

  it('rejects a missing ADMIN role even if the permission is present', () => {
    for (const role of ['STUDENT', 'LECTURER']) {
      const principal: Principal = {
        userId: '00000000-0000-4000-8000-000000000040',
        roles: [role],
        permissions: Object.values(ACTION_PERMISSIONS),
      };
      expect(() => service.requireManaged(principal, 'update')).toThrow(ForbiddenError);
      expect(() => service.requireCreate(principal)).toThrow(ForbiddenError);
      expect(() => service.requireManagedList(principal)).toThrow(ForbiddenError);
    }
  });

  it('rejects missing or case-mismatched permissions', () => {
    expect(() => service.requireManaged(admin([]), 'update')).toThrow(ForbiddenError);
    expect(() => service.requireManaged(admin(['PROBLEM:UPDATE']), 'update')).toThrow(
      ForbiddenError,
    );
  });

  it('requires problem:create and problem:read-managed for list/create gates', () => {
    expect(() => service.requireCreate(admin(['problem:create']))).not.toThrow();
    expect(() => service.requireManagedList(admin(['problem:read-managed']))).not.toThrow();
    expect(() => service.requireCreate(admin([]))).toThrow(ForbiddenError);
    expect(() => service.requireManagedList(admin([]))).toThrow(ForbiddenError);
  });
});

function admin(permissions: string[], userId = '00000000-0000-4000-8000-000000000040'): Principal {
  return { userId, roles: ['ADMIN'], permissions };
}
