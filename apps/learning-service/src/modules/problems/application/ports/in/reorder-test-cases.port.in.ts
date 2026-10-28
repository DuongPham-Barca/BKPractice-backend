import type { ReorderTestCasesCommand } from '@learning/modules/problems/application/command/test-case.commands';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { TestCaseResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IReorderTestCasesPortIn {
  execute(
    principal: Principal,
    problemId: string,
    command: ReorderTestCasesCommand,
  ): Promise<readonly TestCaseResult[]>;
}

export const REORDER_TEST_CASES_PORT_IN = Symbol('REORDER_TEST_CASES_PORT_IN');
