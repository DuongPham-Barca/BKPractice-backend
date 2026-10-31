import { REDIS_CHANNELS } from '@app/contracts';
import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class SubmissionResultSubscriber implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SubmissionResultSubscriber.name);
  private readonly subscriber: Redis;
  private readonly handlers = new Set<(message: string) => void>();
  private redisUnavailableLogged = false;

  constructor(config: ConfigService) {
    this.subscriber = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true });
  }

  onModuleInit(): void {
    this.subscriber.on('message', (_channel, message) => {
      this.handlers.forEach((handler) => handler(message));
    });
    this.subscriber.on('ready', () => {
      if (this.redisUnavailableLogged) this.logger.log('Redis realtime subscriber reconnected');
      this.redisUnavailableLogged = false;
      void this.subscriber.subscribe(REDIS_CHANNELS.submissionResults);
    });
    this.subscriber.on('error', (error: Error) => {
      this.logRedisUnavailable(error.message);
    });
    void this.subscriber.connect().catch((error: unknown) => {
      this.logRedisUnavailable(error instanceof Error ? error.message : 'Redis connection failed');
    });
  }

  subscribe(handler: (message: string) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber.status !== 'end') await this.subscriber.quit();
  }

  private logRedisUnavailable(message: string): void {
    if (this.redisUnavailableLogged) return;
    this.redisUnavailableLogged = true;
    this.logger.warn(`Redis realtime subscriber unavailable: ${message}`);
  }
}
