import type {
  ProblemPage,
  ProblemRepository,
} from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import {
  PublishValidator,
  type PublishReadiness,
} from '@learning/modules/problems/domain/services/publish.validator';
import { PROBLEM_REPOSITORY } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

import { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemSummaryResult } from '../results/problem.results';
import { ProblemAuthorizationService } from '../services/problem-authorization.service';

const MAX_LIMIT = 100;

@Injectable()
export class ListManagedProblemsUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    private readonly publishValidator: PublishValidator,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(
    includeDeleted: boolean,
    page: number,
    limit: number,
  ): Promise<ProblemPage<ManagedProblemSummaryResult>> {
    const principal = await this.authorization.requireManagedList();
    const normalizedPage = normalizePage(page);
    const normalizedLimit = normalizeLimit(limit);
    const result = await this.repository.listManaged({
      ownerId: principal.userId,
      includeDeleted,
      page: normalizedPage,
      limit: normalizedLimit,
    });
    const readinessByProblemId = new Map<string, PublishReadiness>();

    for (const problem of result.items) {
      readinessByProblemId.set(
        problem.id.value,
        this.publishValidator.validate(problem, { slugAvailable: true }),
      );
    }

    return this.resultMapper.toManagedPage(
      result.items,
      result.total,
      result.page,
      result.limit,
      readinessByProblemId,
    );
  }
}

function normalizePage(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function normalizeLimit(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.min(MAX_LIMIT, Math.floor(value)) : 20;
}
