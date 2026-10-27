import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { TestCaseResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IGetTestCasePortIn {
  execute(principal: Principal, problemId: string, testCaseId: string): Promise<TestCaseResult>;
}

export const GET_TEST_CASE_PORT_IN = Symbol('GET_TEST_CASE_PORT_IN');
