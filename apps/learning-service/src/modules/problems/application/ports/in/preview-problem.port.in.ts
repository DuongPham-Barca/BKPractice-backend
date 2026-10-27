import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IPreviewProblemPortIn {
  execute(principal: Principal, id: string): Promise<ManagedProblemDetailResult>;
}

export const PREVIEW_PROBLEM_PORT_IN = Symbol('PREVIEW_PROBLEM_PORT_IN');
