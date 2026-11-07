import { Module } from '@nestjs/common';
import { JUDGE_JOB_PORT } from '@submission/modules/submissions/domain/ports/judge-job.port';
import type { JudgeJobPort } from '@submission/modules/submissions/domain/ports/judge-job.port';
import { SUBMISSION_REPOSITORY_PORT } from '@submission/modules/submissions/domain/ports/submission-repository.port';
import type { SubmissionRepositoryPort } from '@submission/modules/submissions/domain/ports/submission-repository.port';
import { SubmissionsModule } from '@submission/modules/submissions/submissions.module';

import { RunCodeUseCase } from './application/run-code.use-case';
import { RunCodeController } from './presentation/run-code.controller';

// SubmissionsModule exports only the repository and judge-job ports, so Run cannot inject the
// Learning judge-package port (SUB-001-FR-004).
@Module({
  imports: [SubmissionsModule],
  controllers: [RunCodeController],
  providers: [
    {
      provide: RunCodeUseCase,
      inject: [SUBMISSION_REPOSITORY_PORT, JUDGE_JOB_PORT],
      useFactory: (repository: SubmissionRepositoryPort, judge: JudgeJobPort) =>
        new RunCodeUseCase(repository, judge),
    },
  ],
})
export class RunCodeModule {}
