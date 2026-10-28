import type { UpdateTestCaseCommand } from '@learning/modules/problems/application/command/test-case.commands';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { TestCaseResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IUpdateTestCasePortIn {
  execute(
    principal: Principal,
    problemId: string,
    testCaseId: string,
    command: UpdateTestCaseCommand,
  ): Promise<TestCaseResult>;
}

export const UPDATE_TEST_CASE_PORT_IN = Symbol('UPDATE_TEST_CASE_PORT_IN');
