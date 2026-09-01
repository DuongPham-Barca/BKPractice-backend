import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { IdentityServiceModule } from './identity-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(IdentityServiceModule);
  const config = app.get(ConfigService);
  await configureHttpApp(app, {
    serviceName: 'identity-service',
    swaggerTitle: 'BKPractice Identity Service',
    port: config.getOrThrow<number>('IDENTITY_SERVICE_PORT'),
  });
}

void bootstrap();
