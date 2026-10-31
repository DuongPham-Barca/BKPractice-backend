import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

import { ProfileFailure } from '@/modules/profiles/domain';
import { R2AvatarStorage } from '@/modules/profiles/infrastructure/storage';

describe('R2AvatarStorage', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const config = new ConfigService({
    R2_ACCOUNT_ID: 'a'.repeat(32),
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_REFERENCE_SIGNING_KEY: 's'.repeat(32),
    R2_BUCKET: 'test-avatars',
    R2_SIGNED_URL_TTL_SECONDS: 300,
    R2_MAX_UPLOAD_BYTES: 1000,
    R2_ALLOWED_CONTENT_TYPES: 'image/png,image/jpeg',
    R2_CLEANUP_GRACE_SECONDS: 60,
  });

  it('issues an opaque user-scoped reference and rejects external URLs and other owners', async () => {
    const storage = new R2AvatarStorage(config, {} as DataSource);
    const intent = await storage.createUploadIntent(userId, 'image/png', 100);
    expect(intent.avatar).toMatch(/^avatars\/00000000-0000-0000-0000-000000000001\//);
    expect(intent.uploadUrl).toContain('r2.cloudflarestorage.com');
    expect(intent.uploadUrl).not.toContain('test-secret');
    expect(await storage.signReadUrl(userId, intent.avatar)).toContain('X-Amz-Signature=');
    await expect(
      storage.verifyReference('00000000-0000-0000-0000-000000000002', intent.avatar),
    ).rejects.toThrow('invalid');
    await expect(storage.verifyReference(userId, 'https://example.org/avatar.png')).rejects.toThrow(
      'invalid',
    );
    await expect(storage.verifyReference(userId, '../avatars/other')).rejects.toThrow('invalid');
    await expect(storage.createUploadIntent(userId, 'image/svg+xml', 100)).rejects.toThrow(
      ProfileFailure,
    );
    await expect(storage.createUploadIntent(userId, 'image/png', 1001)).rejects.toThrow(
      ProfileFailure,
    );
  });

  it('checks uploaded object metadata before a profile can reference it', async () => {
    const storage = new R2AvatarStorage(config, {} as DataSource);
    const intent = await storage.createUploadIntent(userId, 'image/png', 100);
    const send = jest.fn().mockResolvedValue({ ContentType: 'image/png', ContentLength: 100 });
    Object.defineProperty(storage, 'client', { value: { send } });
    await expect(storage.verifyReference(userId, intent.avatar)).resolves.toBeUndefined();
    send.mockResolvedValueOnce({ ContentType: 'image/svg+xml', ContentLength: 100 });
    await expect(storage.verifyReference(userId, intent.avatar)).rejects.toThrow('invalid');
    send.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(storage.verifyReference(userId, intent.avatar)).rejects.toThrow('dependency');
  });

  it('waits for the grace period and keeps objects that are referenced again', async () => {
    jest.useFakeTimers();
    try {
      const query = jest
        .fn()
        .mockResolvedValueOnce([{ exists: 1 }])
        .mockResolvedValueOnce([]);
      const storage = new R2AvatarStorage(config, { query } as unknown as DataSource);
      const send = jest.fn().mockResolvedValue({});
      Object.defineProperty(storage, 'client', { value: { send } });
      storage.scheduleCleanup('old-avatar');
      expect(query).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(60_000);
      expect(send).not.toHaveBeenCalled();
      storage.scheduleCleanup('old-avatar');
      await jest.advanceTimersByTimeAsync(60_000);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
