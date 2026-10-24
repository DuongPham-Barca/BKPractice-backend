import { Injectable } from '@nestjs/common';

import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

@Injectable()
export class GetPublicProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly repository: ProblemRepository,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(idOrSlug: string): Promise<ProblemDetailResult> {
    await this.authorization.requirePublicRead();

    const problem = await this.repository.findPublishedByIdOrSlug(idOrSlug);

    if (problem === null) {
      throw new ProblemNotFoundError(idOrSlug);
    }

    return this.resultMapper.toDetail(problem);
  }
}
