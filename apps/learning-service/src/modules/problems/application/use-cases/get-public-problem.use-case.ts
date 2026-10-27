import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import type { IGetPublicProblemPortIn } from '@learning/modules/problems/application/ports/in/get-public-problem.port.in';
import { ProblemResultMapper } from '@learning/modules/problems/application/results/problem-result.mapper';
import type { ProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import type { TestCaseRepository } from '@learning/modules/problems/domain/repositories/test-case.repository.port.out';
import {
  PROBLEM_REPOSITORY,
  TEST_CASE_REPOSITORY,
} from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class GetPublicProblemUseCase implements IGetPublicProblemPortIn {
  constructor(
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    @Inject(TEST_CASE_REPOSITORY)
    private readonly testCaseRepository: TestCaseRepository,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(idOrSlug: string): Promise<ProblemDetailResult> {
    const problem = await this.repository.findPublishedByIdOrSlug(idOrSlug);

    if (problem === null) {
      throw new ProblemNotFoundError(idOrSlug);
    }

    const samples = await this.testCaseRepository.listSamples(problem.id.value);

    return this.resultMapper.toDetail(problem, samples);
  }
}
