import type { Principal } from '@learning/modules/problems/application/models/principal';
import type { TestCaseListResult } from '@learning/modules/problems/application/results/test-case.results';

export interface IListTestCasesPortIn {
  execute(principal: Principal, problemId: string): Promise<TestCaseListResult>;
}

export const LIST_TEST_CASES_PORT_IN = Symbol('LIST_TEST_CASES_PORT_IN');
