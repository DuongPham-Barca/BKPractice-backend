import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const leaseMs = 60_000;
const reserveScript = `
local time = redis.call('TIME')
local now = time[1] * 1000 + math.floor(time[2] / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
if ARGV[2] == 'renew' then
  if not redis.call('ZSCORE', KEYS[1], ARGV[1]) then return 0 end
elseif redis.call('ZCARD', KEYS[1]) >= 5 then
  return 0
end
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]), ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`;

@Injectable()
export class SubmissionSocketLeases implements OnModuleInit, OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly logger = new Logger(SubmissionSocketLeases.name);
  private unavailable = false;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      commandTimeout: 3000,
    });
    this.redis.on('error', () => {
      if (!this.unavailable) this.logger.warn('Redis socket leases unavailable');
      this.unavailable = true;
    });
    this.redis.on('ready', () => {
      if (this.unavailable) this.logger.log('Redis socket leases reconnected');
      this.unavailable = false;
    });
  }

  onModuleInit(): void {
    void this.redis.connect().catch(() => undefined);
  }

  async reserve(userId: string, leaseId: string, renew = false): Promise<boolean> {
    if (this.redis.status !== 'ready') return false;
    try {
      return (
        (await this.redis.eval(
          reserveScript,
          1,
          `gateway:submission:sockets:${userId}`,
          leaseId,
          renew ? 'renew' : 'acquire',
          leaseMs,
        )) === 1
      );
    } catch {
      return false;
    }
  }

  async release(userId: string, leaseId: string): Promise<void> {
    if (this.redis.status !== 'ready') return;
    await this.redis.zrem(`gateway:submission:sockets:${userId}`, leaseId).catch(() => undefined);
  }

  onApplicationShutdown(): void {
    this.redis.disconnect();
  }
}
