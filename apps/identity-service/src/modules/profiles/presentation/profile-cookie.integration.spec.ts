import { issueCsrfToken } from '@app/common';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { BK_TOKEN_SERVICE, REFRESH_SESSION_REPOSITORY } from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { IdentityAccessAuthenticator } from '@/modules/auth/presentation';
import { ProfileUseCases } from '@/modules/profiles/application';
import { normalizeProfilePatch } from '@/modules/profiles/domain';
import { ProfileController } from '@/modules/profiles/presentation';

describe('Identity Profile HTTP without Gateway', () => {
  let app: INestApplication;
  let baseUrl: string;
  const profile = { userId: 'user-1', displayName: 'Tên', avatar: null, bio: null };
  const profiles = {
    getMy: jest.fn(async () => profile),
    updateMy: jest.fn(async (_userId: string, input: unknown) => {
      normalizeProfilePatch(input);
      return profile;
    }),
  };
  const tokens = {
    verifyAccessClaims: jest.fn(async (token: string) => {
      if (token === 'invalid') throw new AuthFailure('invalid_token');
      return { sub: 'user-1', sid: 'session-1', roles: ['STUDENT'], permissions: [] };
    }),
  };
  const sessions = { isActive: jest.fn().mockResolvedValue(true) };
  const origin = 'http://localhost:3006';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        IdentityAccessAuthenticator,
        { provide: ProfileUseCases, useValue: profiles },
        { provide: BK_TOKEN_SERVICE, useValue: tokens },
        { provide: REFRESH_SESSION_REPOSITORY, useValue: sessions },
        {
          provide: ConfigService,
          useValue: new ConfigService({ CORS_ORIGINS: origin, JWT_ACCESS_SECRET: 'a'.repeat(32) }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.enableCors({ origin: [origin], credentials: true });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('reads /profile/me from a web cookie or app Bearer', async () => {
    expect((await fetch(`${baseUrl}/api/profile/me`)).status).toBe(401);
    const web = await fetch(`${baseUrl}/api/profile/me`, {
      headers: { cookie: '__Host-bk_access=access' },
    });
    expect(web.status).toBe(200);
    expect(await web.json()).toEqual(profile);
    expect(
      (await fetch(`${baseUrl}/api/profile/me`, { headers: { authorization: 'Bearer access' } }))
        .status,
    ).toBe(200);
  });

  it('accepts one field per PATCH and protects cookie writes with CSRF', async () => {
    const csrf = issueCsrfToken('session-1', 'a'.repeat(32));
    const cookie = `__Host-bk_access=access; __Host-bk_csrf=${csrf}`;
    const headers = { 'content-type': 'application/json', origin, cookie };
    const denied = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ bio: null }),
    });
    expect(denied.status).toBe(403);
    const web = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PATCH',
      headers: { ...headers, 'x-csrf-token': csrf },
      body: JSON.stringify({ bio: null }),
    });
    expect(web.status).toBe(200);
    expect(profiles.updateMy).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ bio: null }),
    );
    const appClient = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer access' },
      body: JSON.stringify({ displayName: 'Tên mới' }),
    });
    expect(appClient.status).toBe(200);
    expect(profiles.updateMy).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ displayName: 'Tên mới' }),
    );
  });

  it('documents PATCH fields as optional strings and starts with a valid single-field example', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(document.components?.schemas?.UpdateProfileDto).toMatchObject({
      properties: {
        avatar: { type: 'string', nullable: true },
        bio: { type: 'string', nullable: true },
      },
    });
    for (const path of ['/api/profile/me', '/api/users/{userId}/profile']) {
      expect(document.paths[path]?.patch?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'X-CSRF-Token', in: 'header', required: false }),
        ]),
      );
      expect(document.paths[path]?.patch?.requestBody).toMatchObject({
        content: {
          'application/json': {
            examples: { displayNameOnly: { value: { displayName: 'Dũng Quốc' } } },
          },
        },
      });
    }
  });

  it('permits configured credentialed browser origins', async () => {
    const response = await fetch(`${baseUrl}/api/profile/me`, {
      method: 'OPTIONS',
      headers: { origin, 'access-control-request-method': 'PATCH' },
    });
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });
});
