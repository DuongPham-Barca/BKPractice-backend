export const LEARNING_JUDGE_PACKAGE_PORT = Symbol('LearningJudgePackagePort');

export interface JudgePackageTestCase {
  readonly id?: string;
  readonly stdin: string;
  readonly expectedOutput?: string;
  readonly score?: number;
}

/** Hidden judge data from Learning. It goes to Judge only and is never stored or returned. */
export interface JudgePackage {
  readonly problemType: 'STANDARD' | 'FUNCTION' | 'OOP';
  readonly timeLimitMs: number;
  readonly memoryLimitMb: number;
  readonly hiddenHarness?: string;
  readonly testCases: readonly JudgePackageTestCase[];
}

/** Learning refused the package; the cause (missing, unpublished, language off) is not known here. */
export class ProblemNotSubmittableError extends Error {
  constructor() {
    super('Problem or language is not available for submission');
    this.name = 'ProblemNotSubmittableError';
  }
}

export class JudgePackageUnavailableError extends Error {
  constructor() {
    super('Unable to prepare the problem judge package');
    this.name = 'JudgePackageUnavailableError';
  }
}

export interface LearningJudgePackagePort {
  getPackage(problemId: string, language: string): Promise<JudgePackage>;
}
