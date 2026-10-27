import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IPublishProblemPortIn {
  execute(id: string): Promise<ManagedProblemDetailResult>;
}

export const PUBLISH_PROBLEM_PORT_IN = Symbol('PUBLISH_PROBLEM_PORT_IN');
