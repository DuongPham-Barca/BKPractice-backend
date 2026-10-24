import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController, AuthModule, AuthTokenIssuer } from '@/modules/auth';
import { identityEntities } from '@/modules/identity.entities';

const testUrl = process.env.TEST_IDENTITY_DATABASE_URL;
const describeDatabase = testUrl ? describe : describe.skip;

describeDatabase('AuthModule composition', () => {
  it('resolves all seven use cases and their adapters', async () => {
    if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
      throw new Error('TEST_IDENTITY_DATABASE_URL must name an isolated _test database');
    }
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              REDIS_URL: 'redis://127.0.0.1:6379',
              AUTH_FLOW_STORE: 'redis',
              MICROSOFT_TENANT_ID: '11111111-1111-4111-8111-111111111111',
              MICROSOFT_CLIENT_ID: '22222222-2222-4222-8222-222222222222',
              MICROSOFT_CLIENT_SECRET: 'test-only',
              MICROSOFT_REDIRECT_URI: 'http://localhost/callback',
              AUTH_WEB_LOGIN_REDIRECT_URL: 'http://localhost/auth/callback',
              JWT_ACCESS_SECRET: 'a'.repeat(32),
              JWT_REFRESH_SECRET: 'r'.repeat(32),
              JWT_ACCESS_TTL: '15m',
              JWT_REFRESH_TTL: '7d',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: testUrl,
          entities: identityEntities,
          synchronize: false,
        }),
        JwtModule.register({ global: true }),
        AuthModule,
      ],
    }).compile();
    expect(module.get(AuthController)).toBeInstanceOf(AuthController);
    expect(module.get(AuthTokenIssuer)).toBeInstanceOf(AuthTokenIssuer);
    await module.close();
  });
});
