import type { ProblemSummaryResult } from '@learning/modules/problems/application/results/problem.results';
import type {
  ProblemListFilter,
  ProblemPage,
} from '@learning/modules/problems/domain/repositories/problem.repository.port.out';

export interface IListPublicProblemsPortIn {
  execute(
    filter: ProblemListFilter,
    page: number,
    limit: number,
  ): Promise<ProblemPage<ProblemSummaryResult>>;
}

export const LIST_PUBLIC_PROBLEMS_PORT_IN = Symbol('LIST_PUBLIC_PROBLEMS_PORT_IN');
