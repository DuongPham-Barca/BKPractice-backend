import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IRestoreProblemPortIn {
  execute(id: string): Promise<ManagedProblemDetailResult>;
}

export const RESTORE_PROBLEM_PORT_IN = Symbol('RESTORE_PROBLEM_PORT_IN');
