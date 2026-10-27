import type { RealtimePort } from '../domain/ports/realtime.port';
import type {
  RunResultPersistenceInput,
  SubmissionExecutionError,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus } from '../domain/submission-record';
import type { TerminalSubmissionStatus } from '../domain/submission-record';

export type RunJudgeStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface RunJudgeResultInput {
  readonly submissionId: string;
  readonly mode: 'RUN' | 'SUBMIT';
  readonly status: RunJudgeStatus;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly compileOutput?: string;
  readonly error?: SubmissionExecutionError;
  readonly runtimeMs?: number;
  readonly memoryKb?: number;
}

export type ApplyRunJudgeResultOutcome =
  | { readonly outcome: 'applied' }
  | {
      readonly outcome: 'ignored';
      readonly reason:
        'not-found' | 'kind-mismatch' | 'mode-mismatch' | 'wrong-answer' | 'already-terminal';
    };

const statusMap: Record<Exclude<RunJudgeStatus, 'WRONG_ANSWER'>, TerminalSubmissionStatus> = {
  ACCEPTED: SubmissionStatus.Executed,
  COMPILE_ERROR: SubmissionStatus.CompileError,
  RUNTIME_ERROR: SubmissionStatus.RuntimeError,
  TIME_LIMIT_EXCEEDED: SubmissionStatus.TimeLimitExceeded,
  MEMORY_LIMIT_EXCEEDED: SubmissionStatus.MemoryLimitExceeded,
  INTERNAL_ERROR: SubmissionStatus.InternalError,
};

export class ApplyRunJudgeResultUseCase {
  constructor(
    private readonly repository: SubmissionRepositoryPort,
    private readonly realtime: RealtimePort,
  ) {}

  async execute(input: RunJudgeResultInput): Promise<ApplyRunJudgeResultOutcome> {
    const submission = await this.repository.findById(input.submissionId);
    if (!submission) return { outcome: 'ignored', reason: 'not-found' };
    if (submission.kind !== SubmissionKind.Run) {
      return { outcome: 'ignored', reason: 'kind-mismatch' };
    }
    if (input.mode !== 'RUN') return { outcome: 'ignored', reason: 'mode-mismatch' };
    // Run has no expected output, so a WRONG_ANSWER from Judge breaks the contract (SUB-001-FR-006).
    if (input.status === 'WRONG_ANSWER') {
      return { outcome: 'ignored', reason: 'wrong-answer' };
    }

    const status = statusMap[input.status];
    const persistenceInput: RunResultPersistenceInput = { ...input, status };
    const applied = await this.repository.applyRunResultOnce(persistenceInput);
    if (!applied) return { outcome: 'ignored', reason: 'already-terminal' };

    await this.realtime.publishResult(applied.userId, {
      submissionId: applied.publicId,
      kind: SubmissionKind.Run,
      status,
      ready: true,
    });
    return { outcome: 'applied' };
  }
}
