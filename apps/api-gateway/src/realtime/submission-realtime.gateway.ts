import { REDIS_CHANNELS } from '@app/contracts';
import type { JudgeResult } from '@app/contracts';
import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

interface AccessPayload {
  sub: string;
  type: 'access';
}

interface SubmissionResultEnvelope {
  userId: string;
  result: JudgeResult;
}

@Injectable()
@WebSocketGateway({ namespace: '/submissions', cors: { origin: true, credentials: true } })
export class SubmissionRealtimeGateway
  implements OnGatewayConnection, OnModuleInit, OnApplicationShutdown
{
  @WebSocketServer() private readonly server!: Server;
  private readonly logger = new Logger(SubmissionRealtimeGateway.name);
  private readonly subscriber: Redis;
  private redisUnavailableLogged = false;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.subscriber = new Redis(config.getOrThrow<string>('REDIS_URL'), { lazyConnect: true });
  }

  onModuleInit(): void {
    this.subscriber.on('message', (_channel, message) => this.forwardResult(message));
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

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = String(client.handshake.auth.token ?? '');
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid access token');
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber.status !== 'end') await this.subscriber.quit();
  }

  private forwardResult(message: string): void {
    try {
      const parsed = JSON.parse(message) as unknown;
      if (!this.isEnvelope(parsed)) return;
      this.server.to(`user:${parsed.userId}`).emit('submission.result', parsed.result);
    } catch (error: unknown) {
      this.logger.warn(error instanceof Error ? error.message : 'Invalid realtime result message');
    }
  }

  private isEnvelope(value: unknown): value is SubmissionResultEnvelope {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.userId === 'string' && typeof candidate.result === 'object';
  }

  private logRedisUnavailable(message: string): void {
    if (this.redisUnavailableLogged) return;
    this.redisUnavailableLogged = true;
    this.logger.warn(`Redis realtime subscriber unavailable: ${message}`);
  }
}
