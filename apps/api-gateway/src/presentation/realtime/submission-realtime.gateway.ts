import { randomUUID } from 'node:crypto';

import { isAllowedBrowserOrigin, readCookie } from '@app/common';
import type { SubmissionRealtimeEnvelope } from '@app/contracts';
import { BK_ACCESS_COOKIE_NAME } from '@app/contracts';
import { GatewaySessionService } from '@gateway/application/auth/gateway-session.service';
import { Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { SubmissionResultsService } from '@/application/realtime';

interface AccessPayload {
  sub: string;
  sid: string;
  jti: string;
  type: 'access';
  exp: number;
}

@Injectable()
@WebSocketGateway({ namespace: '/submissions', cors: { origin: true, credentials: true } })
export class SubmissionRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
  private readonly connections = new Map<
    Socket,
    {
      userId: string;
      leaseId: string;
      exp: number;
      timer: ReturnType<typeof setInterval>;
      expiryTimer?: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: GatewaySessionService,
    private readonly results: SubmissionResultsService,
  ) {
    results.subscribe((envelope) => {
      void this.forwardToActiveSessions(envelope).catch(() => undefined);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    let lease: { userId: string; leaseId: string } | undefined;
    try {
      const authKeys = Object.keys(client.handshake.auth);
      const queryKeys = Object.keys(client.handshake.query ?? {});
      if (
        authKeys.some((key) => key !== 'token') ||
        queryKeys.some((key) => !['EIO', 'transport', 't', 'sid', 'b64', 'j'].includes(key))
      ) {
        throw new Error('Caller-selected socket identity is forbidden');
      }
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
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        typeof payload.sid !== 'string' ||
        !payload.sid ||
        typeof payload.jti !== 'string' ||
        !payload.jti ||
        !Number.isSafeInteger(payload.exp) ||
        payload.exp * 1000 <= Date.now() ||
        !(await this.sessions.isActive(token))
      )
        throw new Error('Invalid access token');
      lease = { userId: payload.sub, leaseId: randomUUID() };
      if (!(await this.results.reserveConnection(lease.userId, lease.leaseId)))
        throw new Error('Socket limit unavailable');
      if (!client.connected || payload.exp * 1000 <= Date.now())
        throw new Error('Socket expired or closed');
      (client.data as Record<string, unknown>).accessToken = token;
      const timer = setInterval(() => {
        void this.refreshConnection(client);
      }, 10_000);
      timer.unref();
      this.connections.set(client, { ...lease, exp: payload.exp * 1000, timer });
      this.closeAtExpiry(client, payload.exp * 1000);
      await client.join(`user:${payload.sub}`);
    } catch {
      this.handleDisconnect(client);
      if (lease) await this.results.releaseConnection(lease.userId, lease.leaseId);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const connection = this.connections.get(client);
    if (!connection) return;
    clearInterval(connection.timer);
    clearTimeout(connection.expiryTimer);
    this.connections.delete(client);
    delete (client.data as Record<string, unknown>).accessToken;
    void this.results.releaseConnection(connection.userId, connection.leaseId);
  }

  onApplicationShutdown(): void {
    for (const client of this.connections.keys()) {
      this.handleDisconnect(client);
      client.disconnect(true);
    }
  }

  private closeAtExpiry(client: Socket, exp: number): void {
    const connection = this.connections.get(client);
    if (!connection) return;
    connection.expiryTimer = setTimeout(
      () => {
        if (!this.connections.has(client)) return;
        if (Date.now() < exp) {
          this.closeAtExpiry(client, exp);
          return;
        }
        this.handleDisconnect(client);
        client.disconnect(true);
      },
      Math.min(exp - Date.now(), 2_147_483_647),
    );
    connection.expiryTimer.unref();
  }

  private async refreshConnection(client: Socket): Promise<boolean> {
    const connection = this.connections.get(client);
    if (!connection) return false;
    if (
      Date.now() >= connection.exp ||
      !(await this.results.reserveConnection(connection.userId, connection.leaseId, true)) ||
      Date.now() >= connection.exp
    ) {
      this.handleDisconnect(client);
      client.disconnect(true);
      return false;
    }
    return this.connections.has(client);
  }

  private async forwardToActiveSessions(envelope: SubmissionRealtimeEnvelope): Promise<void> {
    const sockets = [...this.connections]
      .filter(([, connection]) => connection.userId === envelope.userId)
      .map(([client]) => client);
    await Promise.all(
      sockets.map(async (socket) => {
        const token: unknown = (socket.data as Record<string, unknown>).accessToken;
        if (typeof token !== 'string' || !(await this.sessions.isActive(token))) {
          socket.disconnect(true);
          return;
        }
        if (await this.refreshConnection(socket))
          socket.emit('submission.result', envelope.notification);
      }),
    );
  }
}
