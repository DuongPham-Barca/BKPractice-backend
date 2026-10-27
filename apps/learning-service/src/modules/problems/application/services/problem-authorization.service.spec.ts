import { ForbiddenError } from '@learning/modules/problems/application/errors/forbidden.error';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import {
  buildProblem,
  TEST_USER_ID,
} from '@learning/modules/problems/domain/testing/problem-test.factory';

import {
  ProblemAuthorizationService,
  type OwnedProblemAction,
} from './problem-authorization.service';

const OTHER_USER_ID = '00000000-0000-4000-8000-000000000041';
const ACTION_PERMISSIONS: Record<OwnedProblemAction, string> = {
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

  it('allows a lecturer with the exact permission and ownership', () => {
    for (const action of Object.keys(ACTION_PERMISSIONS) as OwnedProblemAction[]) {
      expect(() =>
        service.requireOwned(principal([ACTION_PERMISSIONS[action]]), problem(), action),
      ).not.toThrow();
    }
  });

  it('rejects a missing lecturer role', () => {
    const student: Principal = {
      userId: TEST_USER_ID,
      roles: ['STUDENT'],
      permissions: Object.values(ACTION_PERMISSIONS),
    };

    expect(() => service.requireOwned(student, problem(), 'update')).toThrow(ForbiddenError);
    expect(() => service.requireCreate(student)).toThrow(ForbiddenError);
    expect(() => service.requireManagedList(student)).toThrow(ForbiddenError);
  });

  it('rejects missing or case-mismatched permissions', () => {
    expect(() => service.requireOwned(principal([]), problem(), 'update')).toThrow(ForbiddenError);
    expect(() => service.requireOwned(principal(['PROBLEM:UPDATE']), problem(), 'update')).toThrow(
      ForbiddenError,
    );
  });

  it('does not grant permissions through the ADMIN role', () => {
    const admin: Principal = { userId: TEST_USER_ID, roles: ['ADMIN'], permissions: [] };

    expect(() => service.requireOwned(admin, problem(), 'update')).toThrow(ForbiddenError);
  });

  it('rejects a different owner even with the right permission', () => {
    const otherOwner: Principal = {
      userId: OTHER_USER_ID,
      roles: ['LECTURER'],
      permissions: ['problem:update'],
    };

    expect(() => service.requireOwned(otherOwner, problem(), 'update')).toThrow(ForbiddenError);
  });

  it('requires problem:create and problem:read-managed for list/create gates', () => {
    expect(() => service.requireCreate(principal(['problem:create']))).not.toThrow();
    expect(() => service.requireManagedList(principal(['problem:read-managed']))).not.toThrow();
    expect(() => service.requireCreate(principal([]))).toThrow(ForbiddenError);
    expect(() => service.requireManagedList(principal([]))).toThrow(ForbiddenError);
  });
});

function principal(permissions: string[]): Principal {
  return { userId: TEST_USER_ID, roles: ['LECTURER'], permissions };
}

function problem() {
  return buildProblem();
}
