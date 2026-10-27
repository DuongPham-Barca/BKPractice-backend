import type { SubmissionKind } from '../submission-record';

import type { JudgePackage } from './learning-judge-package.port';

export const JUDGE_JOB_PORT = Symbol('JudgeJobPort');

export interface RunJudgeJob {
  readonly submissionId: string;
  readonly kind: SubmissionKind.Run;
  readonly language: string;
  readonly sourceCode: string;
  readonly stdin: string;
  readonly timeLimitMs: 3000;
  readonly memoryLimitMb: 256;
}

export interface SubmitJudgeJob {
  readonly submissionId: string;
  readonly kind: SubmissionKind.Submit;
  readonly problemId: string;
  readonly language: string;
  readonly sourceCode: string;
  readonly judgePackage: JudgePackage;
}

export interface JudgeJobPort {
  publish(job: RunJudgeJob | SubmitJudgeJob): Promise<void>;
}
