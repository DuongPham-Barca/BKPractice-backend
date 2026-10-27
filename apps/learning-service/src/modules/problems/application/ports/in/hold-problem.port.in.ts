import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IHoldProblemPortIn {
  execute(principal: Principal, id: string): Promise<ManagedProblemDetailResult>;
}

export const HOLD_PROBLEM_PORT_IN = Symbol('HOLD_PROBLEM_PORT_IN');
