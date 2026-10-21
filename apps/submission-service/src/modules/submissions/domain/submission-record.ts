export enum SubmissionKind {
  Run = 'RUN',
  Submit = 'SUBMIT',
}

export enum SubmissionStatus {
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Running = 'RUNNING',
  Executed = 'EXECUTED',
  Accepted = 'ACCEPTED',
  WrongAnswer = 'WRONG_ANSWER',
  CompileError = 'COMPILE_ERROR',
  RuntimeError = 'RUNTIME_ERROR',
  TimeLimitExceeded = 'TIME_LIMIT_EXCEEDED',
  MemoryLimitExceeded = 'MEMORY_LIMIT_EXCEEDED',
  InternalError = 'INTERNAL_ERROR',
}

export interface SubmissionRecord {
  readonly id: string | null;
  readonly publicId: string | null;
  readonly userId: string;
  readonly problemId: string | null;
  readonly kind: SubmissionKind;
  readonly language: string;
  readonly sourceCode: string;
  readonly stdin: string;
  readonly status: SubmissionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateRunRecordInput {
  readonly userId: string;
  readonly problemId?: string | null;
  readonly language: string;
  readonly sourceCode: string;
  readonly stdin: string;
  readonly now: Date;
}

export class InvalidSubmissionTransitionError extends Error {
  readonly code = 'INVALID_SUBMISSION_TRANSITION';

  constructor(record: SubmissionRecord, target: SubmissionStatus) {
    super(`Cannot transition ${record.kind} submission from ${record.status} to ${target}`);
    this.name = 'InvalidSubmissionTransitionError';
  }
}

export function createRunRecord(input: CreateRunRecordInput): SubmissionRecord {
  return {
    id: null,
    publicId: null,
    userId: input.userId,
    problemId: input.problemId ?? null,
    kind: SubmissionKind.Run,
    language: input.language,
    sourceCode: input.sourceCode,
    stdin: input.stdin,
    status: SubmissionStatus.Pending,
    createdAt: new Date(input.now),
    updatedAt: new Date(input.now),
  };
}

export function markRunQueued(record: SubmissionRecord, now: Date): SubmissionRecord {
  assertPendingRun(record, SubmissionStatus.Queued);

  return {
    ...record,
    status: SubmissionStatus.Queued,
    updatedAt: new Date(now),
  };
}

export function markRunFailedToDispatch(record: SubmissionRecord, now: Date): SubmissionRecord {
  assertPendingRun(record, SubmissionStatus.InternalError);

  return {
    ...record,
    status: SubmissionStatus.InternalError,
    updatedAt: new Date(now),
  };
}

export function isTerminal(status: SubmissionStatus): boolean {
  return ![SubmissionStatus.Pending, SubmissionStatus.Queued, SubmissionStatus.Running].includes(
    status,
  );
}

export function canProduceWrongAnswer(kind: SubmissionKind): boolean {
  return kind === SubmissionKind.Submit;
}

function assertPendingRun(record: SubmissionRecord, target: SubmissionStatus): void {
  if (record.kind !== SubmissionKind.Run || record.status !== SubmissionStatus.Pending) {
    throw new InvalidSubmissionTransitionError(record, target);
  }
}
