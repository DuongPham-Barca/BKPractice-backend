import { Inject, Injectable } from '@nestjs/common';

import type { Principal } from '@/modules/progress/application/models';
import type { IGetMySolvedStatusPortIn } from '@/modules/progress/application/ports/in';
import type { PublishedProblemFilter } from '@/modules/progress/application/ports/out';
import type { SolvedStatusResult } from '@/modules/progress/application/results';
import type { ProgressRepository } from '@/modules/progress/domain/repositories';
import { PROGRESS_REPOSITORY, PUBLISHED_PROBLEM_FILTER } from '@/modules/progress/progress.tokens';
@Injectable()
export class GetMySolvedStatusUseCase implements IGetMySolvedStatusPortIn {
  constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository,
    @Inject(PUBLISHED_PROBLEM_FILTER) private readonly publishedProblems: PublishedProblemFilter,
  ) {}
  async execute(
    principal: Principal,
    problemIds: readonly string[],
  ): Promise<readonly SolvedStatusResult[]> {
    const visible = await this.publishedProblems.findPublishedIds(problemIds);
    const solved = await this.repository.findSolved(principal.userId, [...visible]);
    return problemIds.map((problemId) => {
      const solvedAt = visible.has(problemId) ? (solved.get(problemId) ?? null) : null;
      return { problemId, solved: solvedAt !== null, solvedAt };
    });
  }
}
