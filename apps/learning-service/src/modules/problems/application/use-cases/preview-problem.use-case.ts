import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import type { IPreviewProblemPortIn } from '@learning/modules/problems/application/ports/in/preview-problem.port.in';
import { ProblemResultMapper } from '@learning/modules/problems/application/results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { PROBLEM_REPOSITORY } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PreviewProblemUseCase implements IPreviewProblemPortIn {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string): Promise<ManagedProblemDetailResult> {
    const problem = await this.repository.findByIdIncludingDeleted(id);

    if (problem === null) {
      throw new ProblemNotFoundError(id);
    }

    await this.authorization.requireOwned(problem, 'read-managed');

    const slugAvailable = await this.repository.isSlugAvailable(
      problem.slug.value,
      problem.id.value,
    );
    const readiness = this.publishValidator.validate(problem, { slugAvailable });

    return this.resultMapper.toManagedDetail(problem, readiness);
  }
}
