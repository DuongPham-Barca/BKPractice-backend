import { HealthModule, RabbitMqModule } from '@app/common';
import { databaseOptions, validateEnvironment } from '@app/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RunCodeModule } from './modules/run-code/run-code.module';
import { SubmissionAcceptedOutbox } from './modules/submissions/infrastructure/persistence/submission-accepted-outbox.entity';
import {
  Submission,
  SubmissionResult,
} from './modules/submissions/infrastructure/persistence/submission.entity';
import { SubmissionsModule } from './modules/submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment('submission-service') }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        databaseOptions(config.getOrThrow<string>('SUBMISSION_DATABASE_URL'), [
          Submission,
          SubmissionResult,
          SubmissionAcceptedOutbox,
        ]),
    }),
    HttpModule,
    RabbitMqModule,
    SubmissionsModule,
    RunCodeModule,
    HealthModule.forService('submission-service'),
  ],
})
export class SubmissionServiceModule {}
