import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IRestoreProblemPortIn {
  execute(principal: Principal, id: string): Promise<ManagedProblemDetailResult>;
}

export const RESTORE_PROBLEM_PORT_IN = Symbol('RESTORE_PROBLEM_PORT_IN');
