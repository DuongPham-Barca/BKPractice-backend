import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { LearningServiceModule } from './learning-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(LearningServiceModule);
  app.useBodyParser('json', { limit: '4mb' });
  const config = app.get(ConfigService);
  await configureHttpApp(app, {
    serviceName: 'learning-service',
    swaggerTitle: 'BKPractice Learning Service',
    port: config.getOrThrow<number>('LEARNING_SERVICE_PORT'),
  });
}

void bootstrap();
