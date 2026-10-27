import type { AddTestCaseCommand } from '@learning/modules/problems/application/command/test-case.commands';
import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { TestCaseResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IAddTestCasePortIn {
  execute(
    principal: Principal,
    problemId: string,
    command: AddTestCaseCommand,
  ): Promise<TestCaseResult>;
}

export const ADD_TEST_CASE_PORT_IN = Symbol('ADD_TEST_CASE_PORT_IN');
