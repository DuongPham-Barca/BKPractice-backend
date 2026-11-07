import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import type { IApplyAcceptedSubmissionPortIn } from '@learning/modules/progress/application/ports/in/apply-accepted-submission.port.in';
import { AcceptedSubmission } from '@learning/modules/progress/domain/accepted-submission';
import { ProblemProgress } from '@learning/modules/progress/domain/problem-progress';
import type { ProgressRepository } from '@learning/modules/progress/domain/repositories/progress-repository.port.out';
import {
  PROGRESS_REPOSITORY,
  PROGRESS_TRANSACTION_RUNNER,
} from '@learning/modules/progress/progress.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ApplyAcceptedSubmissionUseCase implements IApplyAcceptedSubmissionPortIn {
  constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository,
    @Inject(PROGRESS_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(rawEvent: unknown): Promise<'APPLIED' | 'DUPLICATE'> {
    const event = AcceptedSubmission.parse(rawEvent);
    return this.transactionRunner.run(async () => {
      if (!(await this.repository.recordReceipt(event))) return 'DUPLICATE';

      if (await this.repository.insertIfAbsent(ProblemProgress.firstSolve(event))) return 'APPLIED';

      const current = await this.repository.loadForUpdate(event.userId, event.problemId);
      await this.repository.save(
        current ? current.applyAccepted(event) : ProblemProgress.firstSolve(event),
      );
      return 'APPLIED';
    });
  }
}
