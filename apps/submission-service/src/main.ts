import { configureHttpApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { SubmissionServiceModule } from './submission-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(SubmissionServiceModule);
  const config = app.get(ConfigService);
  await configureHttpApp(app, {
    serviceName: 'submission-service',
    swaggerTitle: 'BKPractice Submission Service',
    port: config.getOrThrow<number>('SUBMISSION_SERVICE_PORT'),
  });
}

void bootstrap();
