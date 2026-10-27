import type { CreateProblemCommand } from '@learning/modules/problems/application/command/create-problem.command';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface ICreateProblemPortIn {
  execute(command: CreateProblemCommand): Promise<ManagedProblemDetailResult>;
}

export const CREATE_PROBLEM_PORT_IN = Symbol('CREATE_PROBLEM_PORT_IN');
