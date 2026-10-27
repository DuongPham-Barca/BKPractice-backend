import type { Principal } from '@learning/modules/problems/application/models/principal';

export interface IRemoveTestCasePortIn {
  execute(principal: Principal, problemId: string, testCaseId: string): Promise<void>;
}

export const REMOVE_TEST_CASE_PORT_IN = Symbol('REMOVE_TEST_CASE_PORT_IN');
