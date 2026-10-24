import { Injectable } from '@nestjs/common';

import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import type { PublishValidator } from '../../domain/services/publish.validator';
import { ConcurrentModificationError } from '../errors/concurrent-modification.error';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import type { TransactionRunner } from '../ports/out/transaction-runner.port.out';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

@Injectable()
export class RestoreProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    private readonly transactionRunner: TransactionRunner,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string): Promise<ManagedProblemDetailResult> {
    const problem = await this.repository.findByIdIncludingDeleted(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    const principal = await this.authorization.requireOwned(problem, 'restore');
    const now = new Date();
    problem.restore(now);

    const restored = await this.transactionRunner.run(() =>
      this.repository.restore(id, principal.userId, now),
    );

    if (!restored) {
      const current = await this.repository.findByIdIncludingDeleted(id);

      if (current === null) {
        throw new ProblemNotFoundError(id);
      }

      throw new ConcurrentModificationError();
    }

    const slugAvailable = await this.repository.isSlugAvailable(
      problem.slug.value,
      problem.id.value,
    );
    const readiness = this.publishValidator.validate(problem, { slugAvailable });

    return this.resultMapper.toManagedDetail(problem, readiness);
  }
}
