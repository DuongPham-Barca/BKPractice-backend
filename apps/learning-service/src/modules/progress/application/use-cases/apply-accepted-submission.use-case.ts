import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { Inject, Injectable } from '@nestjs/common';

import type { IApplyAcceptedSubmissionPortIn } from '@/modules/progress/application/ports/in';
import { AcceptedSubmission } from '@/modules/progress/domain';
import { ProblemProgress } from '@/modules/progress/domain';
import type { ProgressRepository } from '@/modules/progress/domain/repositories';
import {
  PROGRESS_REPOSITORY,
  PROGRESS_TRANSACTION_RUNNER,
} from '@/modules/progress/progress.tokens';

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
