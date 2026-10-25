import { Logger, ValidationPipe } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { BkTokenService, RefreshSessionRepository } from '@/modules/auth/application';
import type { ProfileUseCases } from '@/modules/profiles/application';
import { ProfileFailure } from '@/modules/profiles/domain';
import {
  ProfileController,
  ProfileFailureFilter,
  UpdateProfileDto,
} from '@/modules/profiles/presentation';
import { RoleName } from '@/modules/rbac/domain';

describe('Profile HTTP contract', () => {
  const publicProfile = { displayName: 'Tên', avatar: null, bio: null };
  const privateProfile = { userId: 'user-id', ...publicProfile };
  const useCases = {
    getMy: jest.fn(async () => privateProfile),
    updateMy: jest.fn(async () => privateProfile),
    getPublic: jest.fn(async () => publicProfile),
    adminGet: jest.fn(async () => privateProfile),
    adminUpdate: jest.fn(async () => privateProfile),
    createAvatarUploadIntent: jest.fn(),
  } as unknown as ProfileUseCases;
  const tokens = {
    verifyAccessClaims: jest.fn(async (token: string) => ({
      sub: 'user-id',
      sid: 'session-id',
      roles: token === 'admin' ? [RoleName.Admin] : [RoleName.Student],
      permissions: [],
    })),
  } as unknown as BkTokenService;
  const sessions = {
    isActive: jest.fn().mockResolvedValue(true),
  } as unknown as RefreshSessionRepository;
  const controller = new ProfileController(useCases, tokens, sessions);

  beforeEach(() => jest.clearAllMocks());

  it('requires Bearer for private operations and never accepts a caller-supplied owner ID', async () => {
    await expect(controller.getMy()).rejects.toThrow('invalid_token');
    await expect(controller.updateMy(undefined, {})).rejects.toThrow('invalid_token');
    expect(await controller.getMy('Bearer student')).toEqual(privateProfile);
    expect(useCases.getMy).toHaveBeenCalledWith('user-id');
  });

  it('rejects a revoked session for every private Profile operation', async () => {
    jest.mocked(sessions.isActive).mockResolvedValue(false);
    await expect(controller.getMy('Bearer student')).rejects.toThrow('invalid_token');
    await expect(controller.updateMy('Bearer student', {})).rejects.toThrow('invalid_token');
    await expect(controller.updateUser('target-id', 'Bearer admin', {})).rejects.toThrow(
      'invalid_token',
    );
    await expect(
      controller.createAvatarUploadIntent('Bearer student', { contentType: 'image/png', size: 1 }),
    ).rejects.toThrow('invalid_token');
    expect(useCases.getMy).not.toHaveBeenCalled();
    expect(useCases.updateMy).not.toHaveBeenCalled();
    expect(useCases.adminUpdate).not.toHaveBeenCalled();
    expect(useCases.createAvatarUploadIntent).not.toHaveBeenCalled();
    jest.mocked(sessions.isActive).mockResolvedValue(true);
  });

  it('uses the public projection by default and the Admin projection only for verified ADMIN', async () => {
    expect(await controller.getUser('target-id')).toEqual(publicProfile);
    expect(await controller.getUser('target-id', 'Bearer student')).toEqual(publicProfile);
    expect(await controller.getUser('target-id', 'Bearer admin')).toEqual(privateProfile);
    expect(useCases.adminGet).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown and protected fields at the HTTP DTO boundary', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const metadata = { type: 'body' as const, metatype: UpdateProfileDto };
    await expect(pipe.transform({ email: 'other@example.edu' }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ displayName: null }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ bio: null, avatar: null }, metadata)).resolves.toMatchObject({
      bio: null,
      avatar: null,
    });
  });

  it('does not log or return a token supplied as a request ID', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
    const request = { method: 'PATCH', header: () => 'sensitive-token' } as unknown as Request;
    const host = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ArgumentsHost;
    try {
      new ProfileFailureFilter().catch(new ProfileFailure('invalid'), host);
      expect(JSON.stringify(warn.mock.calls)).not.toContain('sensitive-token');
      expect(JSON.stringify(json.mock.calls)).not.toContain('sensitive-token');
    } finally {
      warn.mockRestore();
    }
  });
});
