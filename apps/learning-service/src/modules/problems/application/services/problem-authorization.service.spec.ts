import {
  buildProblem,
  TEST_USER_ID,
} from '@learning/modules/problems/domain/testing/problem-test.factory';

import { ForbiddenError } from '../errors/forbidden.error';
import type { Principal } from '../models/principal';
import type { PrincipalProvider } from '../ports/out/principal-provider.port.out';

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
  it('allows a lecturer with the exact permission and ownership', async () => {
    for (const action of Object.keys(ACTION_PERMISSIONS) as OwnedProblemAction[]) {
      const service = serviceWith(principal([ACTION_PERMISSIONS[action]]));

      await expect(service.requireOwned(problem(), action)).resolves.toEqual(
        principal([ACTION_PERMISSIONS[action]]),
      );
    }
  });

  it('rejects a missing lecturer role', async () => {
    const service = serviceWith({
      userId: TEST_USER_ID,
      roles: ['STUDENT'],
      permissions: Object.values(ACTION_PERMISSIONS),
    });

    await expect(service.requireOwned(problem(), 'update')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.requireCreate()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.requireManagedList()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects missing or case-mismatched permissions', async () => {
    const service = serviceWith({ userId: TEST_USER_ID, roles: ['LECTURER'], permissions: [] });

    await expect(service.requireOwned(problem(), 'update')).rejects.toBeInstanceOf(ForbiddenError);

    const caseMismatch = serviceWith({
      userId: TEST_USER_ID,
      roles: ['LECTURER'],
      permissions: ['PROBLEM:UPDATE'],
    });

    await expect(caseMismatch.requireOwned(problem(), 'update')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('does not grant permissions through the ADMIN role', async () => {
    const service = serviceWith({
      userId: TEST_USER_ID,
      roles: ['ADMIN'],
      permissions: [],
    });

    await expect(service.requireOwned(problem(), 'update')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects a different owner even with the right permission', async () => {
    const service = serviceWith({
      userId: OTHER_USER_ID,
      roles: ['LECTURER'],
      permissions: ['problem:update'],
    });

    await expect(service.requireOwned(problem(), 'update')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requires problem:create and problem:read-managed for list/create gates', async () => {
    await expect(serviceWith(principal(['problem:create'])).requireCreate()).resolves.toBeDefined();
    await expect(
      serviceWith(principal(['problem:read-managed'])).requireManagedList(),
    ).resolves.toBeDefined();
    await expect(serviceWith(principal([])).requireCreate()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(serviceWith(principal([])).requireManagedList()).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('allows public read with a principal without role or permissions', async () => {
    const service = serviceWith({ userId: TEST_USER_ID, roles: [], permissions: [] });

    await expect(service.requirePublicRead()).resolves.toEqual({
      userId: TEST_USER_ID,
      roles: [],
      permissions: [],
    });
  });
});

function principal(permissions: string[]): Principal {
  return { userId: TEST_USER_ID, roles: ['LECTURER'], permissions };
}

function serviceWith(principalValue: Principal): ProblemAuthorizationService {
  const provider: PrincipalProvider = {
    getPrincipal: jest.fn().mockResolvedValue(principalValue),
  };

  return new ProblemAuthorizationService(provider);
}

function problem() {
  return buildProblem();
}
