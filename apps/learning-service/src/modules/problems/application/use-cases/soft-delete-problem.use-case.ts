import { ConcurrentModificationError } from '@learning/modules/problems/application/errors/concurrent-modification.error';
import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import type { SoftDeleteProblemResult } from '@learning/modules/problems/application/results/problem.results';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { PROBLEM_REPOSITORY, TRANSACTION_RUNNER } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class SoftDeleteProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(id: string): Promise<SoftDeleteProblemResult> {
    const problem = await this.repository.findById(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    const principal = await this.authorization.requireOwned(problem, 'delete');
    const now = new Date();
    problem.softDelete(now);

    const deleted = await this.transactionRunner.run(() =>
      this.repository.softDelete(id, principal.userId, now),
    );

    if (!deleted) {
      const current = await this.repository.findByIdIncludingDeleted(id);

      if (current !== null && current.isDeleted) {
        throw new ConcurrentModificationError();
      }

      throw new ProblemNotFoundError(id);
    }

    const deletedAt = problem.deletedAt;

    if (deletedAt === null) {
      throw new ConcurrentModificationError();
    }

    return {
      id: problem.id.value,
      publishStatus: problem.publishStatus,
      deletedAt,
    };
  }
}
