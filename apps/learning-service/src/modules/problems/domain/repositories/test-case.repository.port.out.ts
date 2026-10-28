import type { TestCase } from '@learning/modules/problems/domain/test-case.aggregate';

export interface SampleTestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly displayOrder: number;
}

export interface TestCaseRepository {
  findById(problemId: string, testCaseId: string): Promise<TestCase | null>;
  listByProblem(problemId: string): Promise<TestCase[]>;
  listSamples(problemId: string): Promise<readonly SampleTestCase[]>;
  listForJudge(problemId: string): Promise<TestCase[]>;
  add(testCase: TestCase): Promise<void>;
  update(testCase: TestCase): Promise<void>;
  remove(problemId: string, testCaseId: string): Promise<boolean>;
  reorder(problemId: string, orderedIds: readonly string[]): Promise<void>;
}
