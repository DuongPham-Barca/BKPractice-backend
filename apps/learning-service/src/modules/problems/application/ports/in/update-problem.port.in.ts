import type { UpdateProblemCommand } from '@learning/modules/problems/application/command/update-problem.command';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';

export interface IUpdateProblemPortIn {
  execute(id: string, command: UpdateProblemCommand): Promise<ManagedProblemDetailResult>;
}

export const UPDATE_PROBLEM_PORT_IN = Symbol('UPDATE_PROBLEM_PORT_IN');
