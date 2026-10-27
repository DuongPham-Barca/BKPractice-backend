import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IGetManagedProblemPortIn {
  execute(id: string, includeDeleted: boolean): Promise<ManagedProblemDetailResult>;
}

export const GET_MANAGED_PROBLEM_PORT_IN = Symbol('GET_MANAGED_PROBLEM_PORT_IN');
