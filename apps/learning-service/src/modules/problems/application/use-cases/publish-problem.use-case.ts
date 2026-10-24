import { Injectable } from '@nestjs/common';

import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import type { PublishValidator } from '../../domain/services/publish.validator';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import { PublishNotReadyError } from '../errors/publish-not-ready.error';
import type { TransactionRunner } from '../ports/out/transaction-runner.port.out';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

@Injectable()
export class PublishProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    private readonly transactionRunner: TransactionRunner,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string): Promise<ManagedProblemDetailResult> {
    const problem = await this.repository.findById(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    await this.authorization.requireOwned(problem, 'publish');

    const expectedUpdatedAt = problem.updatedAt;
    const slugAvailable = await this.repository.isSlugAvailable(
      problem.slug.value,
      problem.id.value,
    );
    const readiness = this.publishValidator.validate(problem, { slugAvailable });

    if (!readiness.ready) {
      throw new PublishNotReadyError(readiness.issues);
    }

    problem.publish();

    await this.transactionRunner.run(() => this.repository.save(problem, expectedUpdatedAt));

    return this.resultMapper.toManagedDetail(problem, {
      ready: true,
      issues: readiness.issues,
    });
  }
}
