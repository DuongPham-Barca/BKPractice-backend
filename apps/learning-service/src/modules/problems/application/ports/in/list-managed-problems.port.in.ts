import type { ManagedProblemSummaryResult } from '@learning/modules/problems/application/results/problem.results';
import type { ProblemPage } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';

export interface IListManagedProblemsPortIn {
  execute(
    includeDeleted: boolean,
    page: number,
    limit: number,
  ): Promise<ProblemPage<ManagedProblemSummaryResult>>;
}

export const LIST_MANAGED_PROBLEMS_PORT_IN = Symbol('LIST_MANAGED_PROBLEMS_PORT_IN');
