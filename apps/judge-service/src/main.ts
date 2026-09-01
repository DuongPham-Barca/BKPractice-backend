import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { JudgeServiceModule } from './judge-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(JudgeServiceModule);
  const config = app.get(ConfigService);
  await configureHttpApp(app, {
    serviceName: 'judge-service',
    swaggerTitle: 'BKPractice Judge Worker',
    port: config.getOrThrow<number>('JUDGE_SERVICE_PORT'),
  });
}

void bootstrap();
