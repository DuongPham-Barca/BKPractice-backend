import type { GatewaySessionService } from '@gateway/application/auth/gateway-session.service';
import type { SubmissionResultsService } from '@gateway/application/realtime/submission-results.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import { SubmissionRealtimeGateway } from './submission-realtime.gateway';

describe('SubmissionRealtimeGateway authentication', () => {
  const jwt = new JwtService();
  const config = new ConfigService({
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    CORS_ORIGINS: 'https://app.example',
  });
  const sessions = { isActive: jest.fn().mockResolvedValue(true) } as unknown as GatewaySessionService;
  const results = { subscribe: jest.fn() } as unknown as SubmissionResultsService;
  const gateway = new SubmissionRealtimeGateway(jwt, config, sessions, results);

  function client(token: string | undefined, cookie?: string, origin?: string) {
    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    return {
      socket: {
        handshake: { auth: token === undefined ? {} : { token }, headers: { cookie, origin } },
        data: {},
        join,
        disconnect,
      } as unknown as Socket,
      join,
      disconnect,
    };
  }

  it('accepts an access cookie from an allowed browser origin', async () => {
    const token = await jwt.signAsync(
      { sub: 'user-1', sid: 'session-1', jti: 'access-1', type: 'access' },
      { secret: 'a'.repeat(32), expiresIn: '15m' },
    );
    const connection = client(undefined, `__Host-bk_access=${token}`, 'https://app.example');
    await gateway.handleConnection(connection.socket);
    expect(connection.join).toHaveBeenCalledWith('user:user-1');
    expect(connection.disconnect).not.toHaveBeenCalled();
  });

  it('rejects a cookie from an untrusted origin and does not fall back from an invalid explicit token', async () => {
    const token = await jwt.signAsync(
      { sub: 'user-1', sid: 'session-1', jti: 'access-1', type: 'access' },
      { secret: 'a'.repeat(32), expiresIn: '15m' },
    );
    const wrongType = await jwt.signAsync(
      { sub: 'user-1', type: 'refresh' },
      { secret: 'a'.repeat(32), expiresIn: '15m' },
    );
    const expired = await jwt.signAsync(
      { sub: 'user-1', type: 'access', exp: 1 },
      { secret: 'a'.repeat(32) },
    );
    for (const connection of [
      client(undefined, `__Host-bk_access=${token}`, 'https://evil.example'),
      client(undefined, `__Host-bk_access=${wrongType}`, 'https://app.example'),
      client(undefined, `__Host-bk_access=${expired}`, 'https://app.example'),
      client('invalid', `__Host-bk_access=${token}`, 'https://app.example'),
    ]) {
      await gateway.handleConnection(connection.socket);
      expect(connection.disconnect).toHaveBeenCalledWith(true);
      expect(connection.join).not.toHaveBeenCalled();
    }
  });
});
