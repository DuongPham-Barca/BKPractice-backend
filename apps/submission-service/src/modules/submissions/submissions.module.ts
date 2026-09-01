import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Submission, SubmissionResult } from './entities/submission.entity';
import { JudgeResultConsumer } from './judge-result.consumer';
import { LearningJudgeClient } from './learning-judge.client';
import { SubmissionRealtimePublisher } from './submission-realtime.publisher';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, SubmissionResult])],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    LearningJudgeClient,
    JudgeResultConsumer,
    SubmissionRealtimePublisher,
  ],
})
export class SubmissionsModule {}
