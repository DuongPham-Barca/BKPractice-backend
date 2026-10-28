import type {
  DisplayOrder,
  ExpectedOutput,
  HarnessSource,
  TestCaseId,
  TestCaseInput,
  TestCaseScore,
  TestCaseVisibility,
} from '@learning/modules/problems/domain/value-objects';

export interface AddTestCaseCommand {
  readonly input: TestCaseInput;
  readonly expectedOutput: ExpectedOutput;
  readonly visibility: TestCaseVisibility;
  readonly score: TestCaseScore;
  readonly displayOrder?: DisplayOrder;
}

export interface UpdateTestCaseCommand {
  readonly input?: TestCaseInput;
  readonly expectedOutput?: ExpectedOutput;
  readonly visibility?: TestCaseVisibility;
  readonly score?: TestCaseScore;
  readonly displayOrder?: DisplayOrder;
}

export interface ReorderTestCasesCommand {
  readonly testCaseIds: readonly TestCaseId[];
}

export interface SetHarnessCommand {
  readonly language: string;
  readonly source: HarnessSource;
}
