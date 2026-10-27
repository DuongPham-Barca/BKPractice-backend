import { UnauthorizedError } from '@learning/modules/problems/application/errors/unauthorized.error';
import type { Request } from 'express';

import { readTrustedPrincipal } from './trusted-principal.decorator';

const USER_ID = '00000000-0000-4000-8000-000000000031';

describe('readTrustedPrincipal', () => {
  it('parses, trims, and deduplicates trusted headers', () => {
    const principal = readTrustedPrincipal(
      requestWith([
        'X-Auth-User-Id',
        USER_ID,
        'x-auth-roles',
        ' LECTURER , STUDENT ,LECTURER ',
        'x-auth-permissions',
        'problem:create, problem:read-managed,problem:create',
      ]),
    );

    expect(principal).toEqual({
      userId: USER_ID,
      roles: ['LECTURER', 'STUDENT'],
      permissions: ['problem:create', 'problem:read-managed'],
    });
  });

  it('requires a missing user id and invalid UUID to be rejected', () => {
    expect(() => readTrustedPrincipal(requestWith([]))).toThrow(UnauthorizedError);
    expect(() => readTrustedPrincipal(requestWith(['x-auth-user-id', 'not-a-uuid']))).toThrow(
      UnauthorizedError,
    );
  });

  it('rejects duplicate identity, role, and permission headers', () => {
    expect(() =>
      readTrustedPrincipal(requestWith(['x-auth-user-id', USER_ID, 'X-Auth-User-Id', USER_ID])),
    ).toThrow(UnauthorizedError);

    expect(() =>
      readTrustedPrincipal(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-roles',
          'STUDENT',
          'x-auth-roles',
          'LECTURER',
        ]),
      ),
    ).toThrow(UnauthorizedError);

    expect(() =>
      readTrustedPrincipal(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-permissions',
          'problem:create',
          'x-auth-permissions',
          'problem:update',
        ]),
      ),
    ).toThrow(UnauthorizedError);
  });

  it('rejects empty entries, invalid patterns, and values over the cap', () => {
    for (const roles of ['LECTURER,,STUDENT', 'LECTURER,', ',LECTURER', 'Lecturer']) {
      expect(() =>
        readTrustedPrincipal(requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', roles])),
      ).toThrow(UnauthorizedError);
    }

    for (const permissions of ['problem:create,', 'Problem:create', 'problem', 'problem:Create']) {
      expect(() =>
        readTrustedPrincipal(
          requestWith(['x-auth-user-id', USER_ID, 'x-auth-permissions', permissions]),
        ),
      ).toThrow(UnauthorizedError);
    }

    const rolesOverCap = Array.from({ length: 51 }, (_, index) => `ROLE_${index}`);
    expect(() =>
      readTrustedPrincipal(
        requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', rolesOverCap.join(',')]),
      ),
    ).toThrow(UnauthorizedError);

    const permissionsOverCap = Array.from({ length: 201 }, (_, index) => `resource${index}:action`);
    expect(() =>
      readTrustedPrincipal(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-permissions',
          permissionsOverCap.join(','),
        ]),
      ),
    ).toThrow(UnauthorizedError);

    expect(() =>
      readTrustedPrincipal(requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', ''])),
    ).toThrow(UnauthorizedError);
  });

  it('defaults missing permissions to an empty array', () => {
    const principal = readTrustedPrincipal(
      requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', 'LECTURER']),
    );

    expect(principal.permissions).toEqual([]);
  });

  it('ignores authorization, body, query, and non-contract header names', () => {
    const request = requestWith(['x-auth-user-id', USER_ID]);
    const principal = readTrustedPrincipal(
      Object.assign(request, {
        headers: {
          authorization: 'Bearer malicious',
          'x-user-id': '00000000-0000-4000-8000-000000000099',
          'x-permissions': 'problem:create',
        },
        body: { userId: '00000000-0000-4000-8000-000000000098' },
        query: { 'x-auth-user-id': '00000000-0000-4000-8000-000000000097' },
      }),
    );

    expect(principal).toEqual({
      userId: USER_ID,
      roles: [],
      permissions: [],
    });

    expect(() =>
      readTrustedPrincipal(
        requestWith([
          'x-user-id',
          '00000000-0000-4000-8000-000000000099',
          'x-permissions',
          'problem:create',
        ]),
      ),
    ).toThrow(UnauthorizedError);
  });

  it('does not retain references to the request header array', () => {
    const rawHeaders = ['x-auth-user-id', USER_ID, 'x-auth-roles', 'LECTURER'];
    const principal = readTrustedPrincipal(requestWith(rawHeaders));

    rawHeaders[1] = '00000000-0000-4000-8000-000000000099';
    rawHeaders[3] = 'ADMIN';

    expect(principal.userId).toBe(USER_ID);
    expect(principal.roles).toEqual(['LECTURER']);
  });
});

function requestWith(rawHeaders: string[]): Request {
  return {
    rawHeaders,
    headers: {},
    body: {},
    query: {},
  } as unknown as Request;
}
