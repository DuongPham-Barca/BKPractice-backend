import type {
  SubmissionExecutionError,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import type { SubmissionStatus } from '../domain/submission-record';
import { SubmissionKind } from '../domain/submission-record';

export interface GetSubmissionDetailInput {
  readonly ownerId: string;
  readonly publicIdOrLegacyId: string;
}

interface SubmissionDetailBase {
  readonly id: string;
  readonly kind: SubmissionKind;
  readonly problemId: string | null;
  readonly problemTitle: null;
  readonly language: string;
  readonly sourceCodeSize: number;
  readonly status: SubmissionStatus;
  readonly score: number | null;
  readonly passedTests: number | null;
  readonly totalTests: number | null;
  readonly runtimeMs: number | null;
  readonly memoryKb: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceCode: string;
  readonly compileOutput: string | null;
  readonly error: SubmissionExecutionError | null;
}

export interface RunSubmissionDetail extends SubmissionDetailBase {
  readonly kind: SubmissionKind.Run;
  readonly stdout: string | null;
  readonly stderr: string | null;
}

export interface SubmitSubmissionDetail extends SubmissionDetailBase {
  readonly kind: SubmissionKind.Submit;
}

export type SubmissionDetail = RunSubmissionDetail | SubmitSubmissionDetail;

export class GetSubmissionDetailUseCase {
  constructor(private readonly repository: SubmissionRepositoryPort) {}

  async execute(input: GetSubmissionDetailInput): Promise<SubmissionDetail | null> {
    const record = await this.repository.findByPublicIdAndOwner(
      input.publicIdOrLegacyId,
      input.ownerId,
    );
    if (!record) return null;

    const resultFields = record.result
      ? {
          score: record.score,
          passedTests: record.passedTests,
          totalTests: record.totalTests,
          runtimeMs: record.runtimeMs,
          memoryKb: record.memoryKb,
        }
      : {
          score: null,
          passedTests: null,
          totalTests: null,
          runtimeMs: null,
          memoryKb: null,
        };
    const detail: SubmissionDetailBase = {
      id: record.publicId,
      kind: record.kind,
      problemId: record.problemId,
      problemTitle: null,
      language: record.language,
      sourceCodeSize: record.sourceCode.length,
      status: record.status,
      ...resultFields,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      sourceCode: record.sourceCode,
      compileOutput: record.result?.compileOutput ?? null,
      error: record.result?.error ?? null,
    };

    if (record.kind === SubmissionKind.Run) {
      return {
        ...detail,
        kind: SubmissionKind.Run,
        stdout: record.result?.stdout ?? null,
        stderr: record.result?.stderr ?? null,
      };
    }
    return { ...detail, kind: SubmissionKind.Submit };
  }
}
