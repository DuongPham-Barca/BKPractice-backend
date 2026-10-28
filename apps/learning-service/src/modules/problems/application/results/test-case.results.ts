import type { JudgeTestCase, ProblemType, SupportedLanguage } from '@app/contracts';
import type { Harness } from '@learning/modules/problems/domain/harness.aggregate';
import type { SampleTestCase } from '@learning/modules/problems/domain/repositories/test-case.repository.port.out';
import type { TestCase } from '@learning/modules/problems/domain/test-case.aggregate';
import type {
  TestCaseVisibilityValue,
  TestSuiteSummary,
} from '@learning/modules/problems/domain/value-objects';

export interface TestCaseResult {
  readonly id: string;
  readonly input: string;
  readonly expectedOutput: string;
  readonly visibility: TestCaseVisibilityValue;
  readonly score: number;
  readonly displayOrder: number;
}

export interface TestSuiteSummaryResult {
  readonly totalCount: number;
  readonly hiddenCount: number;
  readonly totalScore: number;
  readonly totalBytes: number;
  readonly harnessLanguages: readonly SupportedLanguage[];
}

export interface SampleTestCaseResult {
  readonly input: string;
  readonly expectedOutput: string;
  readonly order: number;
}

export interface HarnessResult {
  readonly language: SupportedLanguage;
  readonly source: string;
}

export interface JudgePackageResult {
  readonly problemId: string;
  readonly problemType: ProblemType;
  readonly timeLimitMs: number;
  readonly memoryLimitMb: number;
  readonly hiddenHarness?: string;
  readonly testCases: JudgeTestCase[];
}

export interface TestCaseListResult {
  readonly items: readonly TestCaseResult[];
  readonly testSuiteSummary: TestSuiteSummaryResult;
}

export function toTestCaseResult(testCase: TestCase): TestCaseResult {
  return {
    id: testCase.id.value,
    input: testCase.input.value,
    expectedOutput: testCase.expectedOutput.value,
    visibility: testCase.visibility.value,
    score: testCase.score.value,
    displayOrder: testCase.displayOrder.value,
  };
}

export function toTestSuiteSummaryResult(summary: TestSuiteSummary): TestSuiteSummaryResult {
  return {
    totalCount: summary.totalCount,
    hiddenCount: summary.hiddenCount,
    totalScore: summary.totalScore,
    totalBytes: summary.totalBytes,
    harnessLanguages: summary.harnessLanguages,
  };
}

export function toSampleTestCaseResults(
  samples: readonly SampleTestCase[],
): readonly SampleTestCaseResult[] {
  return samples.map((sample) => ({
    input: sample.input,
    expectedOutput: sample.expectedOutput,
    order: sample.displayOrder,
  }));
}

export function toHarnessResult(harness: Harness): HarnessResult {
  return {
    language: harness.language,
    source: harness.source.value,
  };
}
