import { Injectable } from '@nestjs/common';

import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import type { PublishValidator } from '../../domain/services/publish.validator';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

@Injectable()
export class GetManagedProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string, includeDeleted: boolean): Promise<ManagedProblemDetailResult> {
    const problem = await this.repository.findByIdIncludingDeleted(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    await this.authorization.requireOwned(problem, 'read-managed');

    if (problem.isDeleted && !includeDeleted) {
      throw new ProblemNotFoundError(id);
    }

    const slugAvailable = await this.repository.isSlugAvailable(
      problem.slug.value,
      problem.id.value,
    );
    const readiness = this.publishValidator.validate(problem, { slugAvailable });

    return this.resultMapper.toManagedDetail(problem, readiness);
  }
}
