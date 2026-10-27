import {
  REDIS_CHANNELS,
  SUBMISSION_NOTIFICATION_KINDS,
  SUBMISSION_NOTIFICATION_STATUSES,
} from '@app/contracts';
import type { SubmissionRealtimeEnvelope, SubmissionResultNotification } from '@app/contracts';
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
    const envelope = parseSubmissionRealtimeEnvelope(message);
    if (!envelope) {
      this.logger.warn('Invalid realtime result message');
      return;
    }
    this.server.to(`user:${envelope.userId}`).emit('submission.result', envelope.notification);
  }

  private logRedisUnavailable(message: string): void {
    if (this.redisUnavailableLogged) return;
    this.redisUnavailableLogged = true;
    this.logger.warn(`Redis realtime subscriber unavailable: ${message}`);
  }
}

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSubmissionRealtimeEnvelope(
  message: string,
): SubmissionRealtimeEnvelope | null {
  try {
    const value = JSON.parse(message) as unknown;
    if (!value || typeof value !== 'object') return null;
    const envelope = value as Record<string, unknown>;
    if (typeof envelope.userId !== 'string' || !uuidV4.test(envelope.userId)) return null;
    if (!envelope.notification || typeof envelope.notification !== 'object') return null;

    const candidate = envelope.notification as Record<string, unknown>;
    if (
      typeof candidate.submissionId !== 'string' ||
      !uuidV4.test(candidate.submissionId) ||
      typeof candidate.kind !== 'string' ||
      !SUBMISSION_NOTIFICATION_KINDS.includes(
        candidate.kind as (typeof SUBMISSION_NOTIFICATION_KINDS)[number],
      ) ||
      typeof candidate.status !== 'string' ||
      !SUBMISSION_NOTIFICATION_STATUSES.includes(
        candidate.status as (typeof SUBMISSION_NOTIFICATION_STATUSES)[number],
      ) ||
      candidate.ready !== true
    ) {
      return null;
    }

    const notification: SubmissionResultNotification = {
      submissionId: candidate.submissionId,
      kind: candidate.kind as SubmissionResultNotification['kind'],
      status: candidate.status as SubmissionResultNotification['status'],
      ready: true,
    };
    return { userId: envelope.userId, notification };
  } catch {
    return null;
  }
}
