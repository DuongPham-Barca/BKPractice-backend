import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { CommunityServiceModule } from './community-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(CommunityServiceModule);
  const config = app.get(ConfigService);
  await configureHttpApp(app, {
    serviceName: 'community-service',
    swaggerTitle: 'BKPractice Community Service',
    port: config.getOrThrow<number>('COMMUNITY_SERVICE_PORT'),
  });
}

void bootstrap();
