import type { SetHarnessCommand } from '@learning/modules/problems/application/command/test-case.commands';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { HarnessResult } from '@learning/modules/problems/application/results/test-case.results';

export interface ISetHarnessPortIn {
  execute(
    principal: Principal,
    problemId: string,
    command: SetHarnessCommand,
  ): Promise<HarnessResult>;
}

export const SET_HARNESS_PORT_IN = Symbol('SET_HARNESS_PORT_IN');
