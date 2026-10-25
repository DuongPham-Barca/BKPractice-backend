import { Inject, Injectable } from '@nestjs/common';

import type {
  ProblemListFilter,
  ProblemPage,
  ProblemRepository,
} from '../../domain/repositories/problem.repository.port.out';
import { PROBLEM_REPOSITORY } from '../../problem.tokens';
import { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ProblemSummaryResult } from '../results/problem.results';
import { ProblemAuthorizationService } from '../services/problem-authorization.service';

const MAX_LIMIT = 100;

@Injectable()
export class ListPublicProblemsUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(
    filter: ProblemListFilter,
    page: number,
    limit: number,
  ): Promise<ProblemPage<ProblemSummaryResult>> {
    await this.authorization.requirePublicRead();

    const normalizedPage = normalizePage(page);
    const normalizedLimit = normalizeLimit(limit);
    const result = await this.repository.listPublished({
      search: filter.search,
      problemType: filter.problemType,
      difficulty: filter.difficulty,
      topicId: filter.topicId,
      tagId: filter.tagId,
      page: normalizedPage,
      limit: normalizedLimit,
    });

    return this.resultMapper.toPage(result.items, result.total, result.page, result.limit);
  }
}

function normalizePage(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function normalizeLimit(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.min(MAX_LIMIT, Math.floor(value)) : 20;
}
