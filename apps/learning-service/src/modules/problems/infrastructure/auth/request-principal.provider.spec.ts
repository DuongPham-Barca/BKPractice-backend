import type { Request } from 'express';

import { UnauthorizedError } from '../../application/errors/unauthorized.error';

import { RequestPrincipalProvider } from './request-principal.provider';

const USER_ID = '00000000-0000-4000-8000-000000000031';

describe('RequestPrincipalProvider', () => {
  it('parses, trims, and deduplicates trusted headers', async () => {
    const provider = new RequestPrincipalProvider(
      requestWith([
        'X-Auth-User-Id',
        USER_ID,
        'x-auth-roles',
        ' LECTURER , STUDENT ,LECTURER ',
        'x-auth-permissions',
        'problem:create, problem:read-managed,problem:create',
      ]),
    );

    await expect(provider.getPrincipal()).resolves.toEqual({
      userId: USER_ID,
      roles: ['LECTURER', 'STUDENT'],
      permissions: ['problem:create', 'problem:read-managed'],
    });
  });

  it('requires a missing user id and invalid UUID to be rejected', async () => {
    await expect(
      new RequestPrincipalProvider(requestWith([])).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      new RequestPrincipalProvider(requestWith(['x-auth-user-id', 'not-a-uuid'])).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects duplicate identity, role, and permission headers', async () => {
    await expect(
      new RequestPrincipalProvider(
        requestWith(['x-auth-user-id', USER_ID, 'X-Auth-User-Id', USER_ID]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(
      new RequestPrincipalProvider(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-roles',
          'STUDENT',
          'x-auth-roles',
          'LECTURER',
        ]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(
      new RequestPrincipalProvider(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-permissions',
          'problem:create',
          'x-auth-permissions',
          'problem:update',
        ]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects empty entries, invalid patterns, and values over the cap', async () => {
    for (const roles of ['LECTURER,,STUDENT', 'LECTURER,', ',LECTURER', 'Lecturer']) {
      await expect(
        new RequestPrincipalProvider(
          requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', roles]),
        ).getPrincipal(),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    }

    for (const permissions of ['problem:create,', 'Problem:create', 'problem', 'problem:Create']) {
      await expect(
        new RequestPrincipalProvider(
          requestWith(['x-auth-user-id', USER_ID, 'x-auth-permissions', permissions]),
        ).getPrincipal(),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    }

    const rolesOverCap = Array.from({ length: 51 }, (_, index) => `ROLE_${index}`);
    await expect(
      new RequestPrincipalProvider(
        requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', rolesOverCap.join(',')]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const permissionsOverCap = Array.from({ length: 201 }, (_, index) => `resource${index}:action`);
    await expect(
      new RequestPrincipalProvider(
        requestWith([
          'x-auth-user-id',
          USER_ID,
          'x-auth-permissions',
          permissionsOverCap.join(','),
        ]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(
      new RequestPrincipalProvider(
        requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', '']),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('defaults missing permissions to an empty array', async () => {
    const principal = await new RequestPrincipalProvider(
      requestWith(['x-auth-user-id', USER_ID, 'x-auth-roles', 'LECTURER']),
    ).getPrincipal();

    expect(principal.permissions).toEqual([]);
  });

  it('ignores authorization, body, query, and non-contract header names', async () => {
    const request = requestWith(['x-auth-user-id', USER_ID]);
    const provider = new RequestPrincipalProvider(
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

    await expect(provider.getPrincipal()).resolves.toEqual({
      userId: USER_ID,
      roles: [],
      permissions: [],
    });

    await expect(
      new RequestPrincipalProvider(
        requestWith([
          'x-user-id',
          '00000000-0000-4000-8000-000000000099',
          'x-permissions',
          'problem:create',
        ]),
      ).getPrincipal(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('does not retain references to the request header array', async () => {
    const rawHeaders = ['x-auth-user-id', USER_ID, 'x-auth-roles', 'LECTURER'];
    const principal = await new RequestPrincipalProvider(requestWith(rawHeaders)).getPrincipal();

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
