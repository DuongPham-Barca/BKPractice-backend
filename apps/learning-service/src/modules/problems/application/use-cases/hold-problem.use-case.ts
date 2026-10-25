import { Inject, Injectable } from '@nestjs/common';

import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import { PublishValidator } from '../../domain/services/publish.validator';
import { PROBLEM_REPOSITORY, TRANSACTION_RUNNER } from '../../problem.tokens';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import type { TransactionRunner } from '../ports/out/transaction-runner.port.out';
import { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import { ProblemAuthorizationService } from '../services/problem-authorization.service';

@Injectable()
export class HoldProblemUseCase {
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
