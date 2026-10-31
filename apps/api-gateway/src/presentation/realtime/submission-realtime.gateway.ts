import { isAllowedBrowserOrigin, readCookie } from '@app/common';
import { BK_ACCESS_COOKIE_NAME } from '@app/contracts';
import type { SubmissionRealtimeEnvelope } from '@app/contracts';
import { GatewaySessionService } from '@gateway/application/auth/gateway-session.service';
import { SubmissionResultsService } from '@gateway/application/realtime/submission-results.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

interface AccessPayload {
  sub: string;
  sid: string;
  jti: string;
  type: 'access';
}

@Injectable()
@WebSocketGateway({ namespace: '/submissions', cors: { origin: true, credentials: true } })
export class SubmissionRealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: GatewaySessionService,
    results: SubmissionResultsService,
  ) {
    results.subscribe((envelope) => {
      void this.forwardToActiveSessions(envelope).catch(() => undefined);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const explicitToken: unknown = client.handshake.auth.token;
      const cookie = readCookie(client.handshake.headers.cookie, BK_ACCESS_COOKIE_NAME);
      const fromCookie = explicitToken === undefined;
      if (
        fromCookie &&
        !isAllowedBrowserOrigin(
          client.handshake.headers.origin,
          client.handshake.headers.referer,
          this.config.getOrThrow<string>('CORS_ORIGINS'),
        )
      ) {
        throw new Error('Untrusted socket origin');
      }
      const token: unknown = fromCookie ? cookie : explicitToken;
      if (typeof token !== 'string' || !token) throw new Error('Missing access token');
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.type !== 'access' ||
        !payload.sub ||
        !payload.sid ||
        !payload.jti ||
        !(await this.sessions.isActive(token))
      )
        throw new Error('Invalid access token');
      (client.data as Record<string, unknown>).accessToken = token;
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  private async forwardToActiveSessions(envelope: SubmissionRealtimeEnvelope): Promise<void> {
    const sockets = await this.server.in(`user:${envelope.userId}`).fetchSockets();
    await Promise.all(
      sockets.map(async (socket) => {
        const token: unknown = (socket.data as Record<string, unknown>).accessToken;
        if (typeof token !== 'string' || !(await this.sessions.isActive(token))) {
          socket.disconnect(true);
          return;
        }
        socket.emit('submission.result', envelope.notification);
      }),
    );
  }
}
