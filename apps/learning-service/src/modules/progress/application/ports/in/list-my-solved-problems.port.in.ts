import type { Principal } from '@/modules/progress/application/models';
import type { SolvedProblemPage } from '@/modules/progress/domain/repositories';
export interface IListMySolvedProblemsPortIn {
  execute(principal: Principal, page: number, limit: number): Promise<SolvedProblemPage>;
}
export const LIST_MY_SOLVED_PROBLEMS_PORT_IN = Symbol('LIST_MY_SOLVED_PROBLEMS_PORT_IN');
