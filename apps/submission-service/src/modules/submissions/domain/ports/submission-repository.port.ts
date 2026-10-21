import type { SubmissionRecord, SubmissionStatus } from '../submission-record';

export const SUBMISSION_REPOSITORY_PORT = Symbol('SubmissionRepositoryPort');

export interface PersistedSubmissionRecord extends SubmissionRecord {
  readonly id: string;
  readonly publicId: string;
}

export interface SubmissionExecutionError {
  readonly line?: number;
  readonly column?: number;
  readonly message: string;
}

export interface RunResultPersistenceInput {
  readonly submissionId: string;
  readonly status: SubmissionStatus;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly compileOutput?: string;
  readonly error?: SubmissionExecutionError;
  readonly runtimeMs?: number;
  readonly memoryKb?: number;
}

export interface SubmissionDetailRecord extends PersistedSubmissionRecord {
  readonly score: number;
  readonly passedTests: number | null;
  readonly totalTests: number | null;
  readonly runtimeMs: number | null;
  readonly memoryKb: number | null;
  readonly result: {
    readonly stdout: string | null;
    readonly stderr: string | null;
    readonly compileOutput: string | null;
    readonly error: SubmissionExecutionError | null;
  } | null;
}

export interface SubmissionRepositoryPort {
  save(record: SubmissionRecord): Promise<PersistedSubmissionRecord>;
  findById(id: string): Promise<PersistedSubmissionRecord | null>;
  findByIdAndOwner(id: string, ownerId: string): Promise<PersistedSubmissionRecord | null>;
  findByPublicIdAndOwner(
    publicIdOrLegacyId: string,
    ownerId: string,
  ): Promise<SubmissionDetailRecord | null>;
  markRunQueued(id: string, now: Date): Promise<PersistedSubmissionRecord | null>;
  markRunFailedToDispatch(id: string, now: Date): Promise<PersistedSubmissionRecord | null>;
  applyRunResultOnce(input: RunResultPersistenceInput): Promise<PersistedSubmissionRecord | null>;
  expireStaleRuns(cutoff: Date, now: Date): Promise<readonly PersistedSubmissionRecord[]>;
}
