import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { BK_TOKEN_SERVICE, REFRESH_SESSION_REPOSITORY } from '@/modules/auth/application';
import { IdentityAccessAuthenticator } from '@/modules/auth/presentation';
import {
  ProfileUseCases,
  type AvatarStorage,
  type IdentityProfileContext,
  type ProfileRepository,
} from '@/modules/profiles/application';
import { ProfileController } from '@/modules/profiles/presentation';
import { RoleName } from '@/modules/rbac/domain';

describe('Profile cross-user authorization over HTTP', () => {
  const studentId = '00000000-0000-0000-0000-000000000001';
  const targetId = '00000000-0000-0000-0000-000000000002';
  const adminId = '00000000-0000-0000-0000-000000000003';
  let app: INestApplication;
  let baseUrl: string;
  const update = jest.fn(async (userId: string) => ({
    profile: {
      profileId: 'profile-id',
      userId,
      displayName: 'Target',
      avatarReference: null,
      bio: 'Updated',
    },
    replacedAvatar: null,
  }));

  beforeAll(async () => {
    const accounts: IdentityProfileContext = {
      findAccount: async (userId) => ({ userId, displayName: 'Target', status: 'ACTIVE' }),
    };
    const repository = { update } as unknown as ProfileRepository;
    const avatars = { signReadUrl: jest.fn() } as unknown as AvatarStorage;
    const tokens = {
      verifyAccessClaims: async (token: string) => ({
        sub: token === 'admin' ? adminId : studentId,
        sid: 'session-id',
        roles: token === 'admin' ? [RoleName.Admin] : [RoleName.Student],
        permissions: [],
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        IdentityAccessAuthenticator,
        { provide: ProfileUseCases, useValue: new ProfileUseCases(accounts, repository, avatars) },
        { provide: BK_TOKEN_SERVICE, useValue: tokens },
        { provide: REFRESH_SESSION_REPOSITORY, useValue: { isActive: async () => true } },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CORS_ORIGINS: 'http://localhost:3006',
            JWT_ACCESS_SECRET: 'a'.repeat(32),
          }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => update.mockClear());

  async function patch(userId: string, token: string, extraHeaders = {}) {
    return fetch(`${baseUrl}/api/users/${userId}/profile`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({ bio: 'Updated' }),
    });
  }

  it('returns 403 for a STUDENT changing another profile, even with a forged role header', async () => {
    const response = await patch(targetId, 'student', { 'x-auth-roles': 'ADMIN' });
    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows an ADMIN to change the target profile', async () => {
    const response = await patch(targetId, 'admin');
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(targetId, null, { bio: 'Updated' }, false);
  });
});
