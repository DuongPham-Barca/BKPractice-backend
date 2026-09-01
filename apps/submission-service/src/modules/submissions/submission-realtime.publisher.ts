import { REDIS_CHANNELS } from '@app/contracts';
import type { JudgeResult } from '@app/contracts';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class SubmissionRealtimePublisher implements OnApplicationShutdown {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true });
  }

  async emitResult(userId: string, result: JudgeResult): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
    await this.redis.set(
      `submission:result:${result.submissionId}`,
      JSON.stringify(result),
      'EX',
      300,
    );
    await this.redis.publish(REDIS_CHANNELS.submissionResults, JSON.stringify({ userId, result }));
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit();
  }
}
