import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { RedisAuthFlowStore } from '@/modules/auth/infrastructure/redis';

jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn() }));

describe('RedisAuthFlowStore', () => {
  const values = new Map<string, string>();
  const set = jest.fn(async (key: string, value: string) => {
    values.set(key, value);
    return 'OK';
  });
  const getdel = jest.fn(async (key: string) => {
    const value = values.get(key) ?? null;
    values.delete(key);
    return value;
  });
  const redis = { set, getdel, on: jest.fn(), disconnect: jest.fn() } as unknown as Redis;
  const config = new ConfigService({ REDIS_URL: 'redis://127.0.0.1:6379' });

  beforeEach(() => {
    values.clear();
    set.mockClear();
    getdel.mockClear();
    jest.mocked(Redis).mockImplementation(() => redis);
  });

  it('stores OAuth state for 300 seconds and consumes it once', async () => {
    const store = new RedisAuthFlowStore(config);
    await store.putTransaction('state', { nonce: 'nonce', verifier: 'verifier' });
    expect(set).toHaveBeenCalledWith('auth:oauth:state', expect.any(String), 'EX', 300);
    expect(await store.takeTransaction('state')).toEqual({ nonce: 'nonce', verifier: 'verifier' });
    expect(await store.takeTransaction('state')).toBeNull();
  });

  it('stores only a user ID under a hashed login-code key for 60 seconds', async () => {
    const store = new RedisAuthFlowStore(config);
    const code = await store.createLoginCode('user-1');
    expect(set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:login-code:[a-f0-9]{64}$/),
      'user-1',
      'EX',
      60,
    );
    expect([...values.keys()][0]).not.toContain(code);
    expect(await store.takeLoginCode(code)).toBe('user-1');
    expect(await store.takeLoginCode(code)).toBeNull();
  });
});
