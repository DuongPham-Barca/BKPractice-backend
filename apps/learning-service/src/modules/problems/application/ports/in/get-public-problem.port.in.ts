import type { ProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IGetPublicProblemPortIn {
  execute(idOrSlug: string): Promise<ProblemDetailResult>;
}

export const GET_PUBLIC_PROBLEM_PORT_IN = Symbol('GET_PUBLIC_PROBLEM_PORT_IN');
