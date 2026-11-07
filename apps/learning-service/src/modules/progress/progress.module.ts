import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { APPLY_ACCEPTED_SUBMISSION_PORT_IN } from './application/ports/in/apply-accepted-submission.port.in';
import { ApplyAcceptedSubmissionUseCase } from './application/use-cases/apply-accepted-submission.use-case';
import { ProgressEventReceipt } from './entities/progress-event-receipt.entity';
import { Progress } from './entities/progress.entity';
import { ProgressTransactionContext } from './infrastructure/persistence/progress-transaction-context';
import { ProgressTransactionRunner } from './infrastructure/persistence/progress-transaction-runner';
import { ProgressTypeOrmRepository } from './infrastructure/persistence/progress.typeorm-repository';
import { ProgressConsumer } from './presentation/messaging/progress.consumer';
import { PROGRESS_REPOSITORY, PROGRESS_TRANSACTION_RUNNER } from './progress.tokens';

@Module({
  imports: [TypeOrmModule.forFeature([Progress, ProgressEventReceipt])],
  providers: [
    ProgressConsumer,
    ApplyAcceptedSubmissionUseCase,
    ProgressTransactionContext,
    ProgressTransactionRunner,
    ProgressTypeOrmRepository,
    { provide: APPLY_ACCEPTED_SUBMISSION_PORT_IN, useExisting: ApplyAcceptedSubmissionUseCase },
    { provide: PROGRESS_REPOSITORY, useExisting: ProgressTypeOrmRepository },
    { provide: PROGRESS_TRANSACTION_RUNNER, useExisting: ProgressTransactionRunner },
  ],
})
export class ProgressModule {}
