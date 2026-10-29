import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import {
  ResetPasswordWithGrant,
  SendPasswordResetOtp,
  VerifyPasswordResetOtp,
} from '@/modules/auth/application';
import { PasswordResetController } from '@/modules/auth/presentation/password-reset.controller';

describe('Password reset HTTP contract', () => {
  let app: INestApplication;
  let baseUrl: string;
  const send = jest.fn().mockResolvedValue(undefined);
  const verify = jest.fn().mockResolvedValue({ resetToken: 'a'.repeat(43) });
  const reset = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1 }])],
      controllers: [PasswordResetController],
      providers: [
        ThrottlerGuard,
        {
          provide: ConfigService,
          useValue: new ConfigService({ CORS_ORIGINS: 'https://app.example' }),
        },
        { provide: SendPasswordResetOtp, useValue: { execute: send } },
        { provide: VerifyPasswordResetOtp, useValue: { execute: verify } },
        { provide: ResetPasswordWithGrant, useValue: { execute: reset } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  async function post(path: string, body: object, origin = 'https://app.example') {
    return fetch(`${baseUrl}/api/auth/password/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify(body),
    });
  }

  it('validates and normalizes email, then throttles the public send route', async () => {
    expect((await post('send-otp', { email: ' STUDENT@SCHOOL.EDU ' })).status).toBe(202);
    expect(send).toHaveBeenCalledWith('student@school.edu');
    expect((await post('send-otp', { email: 'student@school.edu' })).status).toBe(429);
  });

  it('returns an opaque grant only after verify and a bodyless 204 after reset', async () => {
    const verified = await post('verify-otp', { email: 'student@school.edu', otp: '123456' });
    expect(verified.status).toBe(200);
    expect(await verified.json()).toEqual({ resetToken: 'a'.repeat(43) });
    const changed = await post('reset', {
      resetToken: 'a'.repeat(43),
      newPassword: 'new-password',
    });
    expect(changed.status).toBe(204);
    expect(await changed.text()).toBe('');
    expect(reset).toHaveBeenCalledWith('a'.repeat(43), 'new-password');
  });
});
