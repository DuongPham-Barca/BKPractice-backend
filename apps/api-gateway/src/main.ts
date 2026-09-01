import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiGatewayModule);
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  await configureHttpApp(app, {
    serviceName: 'api-gateway',
    swaggerTitle: 'BKPractice API Gateway',
    port: config.getOrThrow<number>('API_GATEWAY_PORT'),
  });
}

void bootstrap();
