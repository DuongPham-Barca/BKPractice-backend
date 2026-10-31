import { Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { createGatewayThrottlers } from './gateway-throttling';

@Controller('api/auth')
class TestAuthController {
  @Post('login') login(): string {
    return 'ok';
  }
  @Get('microsoft') microsoft(): string {
    return 'ok';
  }
  @Post('password/send-otp') sendOtp(): string {
    return 'ok';
  }
  @Post('password/verify-otp') verifyOtp(): string {
    return 'ok';
  }
  @Post('password/reset') resetPassword(): string {
    return 'ok';
  }
}

const config = new ConfigService({
  AUTH_RATE_LIMIT_TTL_MS: 60_000,
  AUTH_PASSWORD_LOGIN_RATE_LIMIT: 5,
  AUTH_OAUTH_RATE_LIMIT: 30,
});

@Module({
  imports: [ThrottlerModule.forRoot(createGatewayThrottlers(config))],
  controllers: [TestAuthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class TestGatewayModule {}

describe('Gateway authentication throttling', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [TestGatewayModule] }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits password login to five requests per path while OAuth uses its separate limit', async () => {
    for (let count = 0; count < 5; count += 1) {
      expect((await fetch(`${baseUrl}/api/auth/login`, { method: 'POST' })).status).toBe(201);
    }
    expect((await fetch(`${baseUrl}/api/auth/login`, { method: 'POST' })).status).toBe(429);
    expect((await fetch(`${baseUrl}/api/auth/microsoft`)).status).toBe(200);
  });

  it.each(['send-otp', 'verify-otp', 'reset'])('limits password %s requests', async (path) => {
    for (let count = 0; count < 5; count += 1) {
      expect((await fetch(`${baseUrl}/api/auth/password/${path}`, { method: 'POST' })).status).toBe(201);
    }
    expect((await fetch(`${baseUrl}/api/auth/password/${path}`, { method: 'POST' })).status).toBe(429);
  });
});
