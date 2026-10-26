import { HealthModule, RequestIdMiddleware } from '@app/common';
import { validateEnvironment } from '@app/config';
import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { GatewayAuthMiddleware } from './auth/gateway-auth.middleware';
import { GatewaySessionVerifier } from './auth/gateway-session-verifier';
import { GatewayProxyController } from './proxy/gateway-proxy.controller';
import { GatewayProxyService } from './proxy/gateway-proxy.service';
import { SubmissionRealtimeGateway } from './realtime/submission-realtime.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment('api-gateway') }),
    HttpModule.register({}),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule.forService('api-gateway'),
  ],
  controllers: [GatewayProxyController],
  providers: [
    GatewayProxyService,
    GatewayAuthMiddleware,
    GatewaySessionVerifier,
    SubmissionRealtimeGateway,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, GatewayAuthMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'docs/{*path}', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
