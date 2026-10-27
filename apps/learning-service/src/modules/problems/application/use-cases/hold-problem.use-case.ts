import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import type { IHoldProblemPortIn } from '@learning/modules/problems/application/ports/in/hold-problem.port.in';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { ProblemResultMapper } from '@learning/modules/problems/application/results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { PROBLEM_REPOSITORY, TRANSACTION_RUNNER } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class HoldProblemUseCase implements IHoldProblemPortIn {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunner,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string): Promise<ManagedProblemDetailResult> {
    const problem = await this.repository.findById(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    await this.authorization.requireOwned(problem, 'hold');

    const expectedUpdatedAt = problem.updatedAt;
    problem.hold();

    await this.transactionRunner.run(() => this.repository.save(problem, expectedUpdatedAt));

    const readiness = this.publishValidator.validate(problem, {
      slugAvailable: true,
    });

    return this.resultMapper.toManagedDetail(problem, readiness);
  }
}
