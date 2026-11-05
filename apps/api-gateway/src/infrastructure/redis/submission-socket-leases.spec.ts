import { ConfigService } from '@nestjs/config';

import { SubmissionSocketLeases } from './submission-socket-leases';

const redis = {
  status: 'ready',
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  eval: jest.fn(),
  zrem: jest.fn().mockResolvedValue(1),
  disconnect: jest.fn(),
};
jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn(() => redis) }));

describe('SubmissionSocketLeases', () => {
  const leases = new SubmissionSocketLeases(new ConfigService({ REDIS_URL: 'redis://localhost' }));
  beforeEach(() => {
    jest.clearAllMocks();
    redis.status = 'ready';
  });
  it('uses the same atomic Redis operation and owner key across Gateway instances', async () => {
    redis.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect(await leases.reserve('owner', 'socket-a')).toBe(true);
    expect(await leases.reserve('owner', 'socket-b')).toBe(false);
    expect(await leases.reserve('owner', 'socket-a', true)).toBe(true);
    expect(redis.eval).toHaveBeenLastCalledWith(
      expect.stringContaining("redis.call('ZCARD', KEYS[1]) >= 5"),
      1,
      'gateway:submission:sockets:owner',
      'socket-a',
      'renew',
      60000,
    );
    await leases.release('owner', 'socket-a');
    expect(redis.zrem).toHaveBeenCalledWith('gateway:submission:sockets:owner', 'socket-a');
  });
  it('fails closed when Redis is offline or the lease operation fails', async () => {
    redis.status = 'reconnecting';
    expect(await leases.reserve('owner', 'socket')).toBe(false);
    expect(redis.eval).not.toHaveBeenCalled();
    redis.status = 'ready';
    redis.eval.mockRejectedValueOnce(new Error('unavailable'));
    expect(await leases.reserve('owner', 'socket')).toBe(false);
    redis.zrem.mockRejectedValueOnce(new Error('unavailable'));
    await expect(leases.release('owner', 'socket')).resolves.toBeUndefined();
    leases.onApplicationShutdown();
    expect(redis.disconnect).toHaveBeenCalled();
  });
});
