import type { SubmissionKind } from '../submission-record';

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

export interface JudgeJobPort {
  publish(job: RunJudgeJob): Promise<void>;
}
