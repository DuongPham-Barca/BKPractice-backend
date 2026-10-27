import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IRepublishProblemPortIn {
  execute(id: string): Promise<ManagedProblemDetailResult>;
}

export const REPUBLISH_PROBLEM_PORT_IN = Symbol('REPUBLISH_PROBLEM_PORT_IN');
