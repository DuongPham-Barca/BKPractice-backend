import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { SoftDeleteProblemResult } from '@learning/modules/problems/application/results/problem.results';

export interface ISoftDeleteProblemPortIn {
  execute(principal: Principal, id: string): Promise<SoftDeleteProblemResult>;
}

export const SOFT_DELETE_PROBLEM_PORT_IN = Symbol('SOFT_DELETE_PROBLEM_PORT_IN');
