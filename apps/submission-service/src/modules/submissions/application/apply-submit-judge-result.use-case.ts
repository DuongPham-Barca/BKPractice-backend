import { randomUUID } from 'node:crypto';

import type { RealtimePort } from '../domain/ports/realtime.port';
import type {
  SubmissionExecutionError,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import {
  ACCEPTED_PROGRESS_SCORE,
  SubmissionKind,
  applyVerdict,
  isOfficiallyAccepted,
  isTerminal,
  toJudgeVerdictStatus,
} from '../domain/submission-record';
import type { SubmitVerdict } from '../domain/submission-record';

export interface SubmitJudgeResultInput {
  readonly submissionId: string;
  readonly status: string;
  readonly score?: number;
  readonly passedTests?: number;
  readonly totalTests?: number;
  readonly runtimeMs?: number;
  readonly memoryKb?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly compileOutput?: string;
  readonly error?: SubmissionExecutionError;
}

export type ApplySubmitJudgeResultOutcome =
  | { readonly outcome: 'applied' }
  | { readonly outcome: 'ignored'; readonly reason: 'kind-mismatch' | 'already-terminal' };

/** Thrown for a result that must not be acknowledged, so the consumer dead-letters it. */
export class RejectedJudgeResultError extends Error {
  constructor(readonly reason: 'unknown-status' | 'unknown-submission') {
    super(`Rejected Submit judge result: ${reason}`);
    this.name = 'RejectedJudgeResultError';
  }
}

export class ApplySubmitJudgeResultUseCase {
  constructor(
    private readonly repository: SubmissionRepositoryPort,
    private readonly realtime: RealtimePort,
    private readonly generateEventId: () => string = randomUUID,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SubmitJudgeResultInput): Promise<ApplySubmitJudgeResultOutcome> {
    const status = toJudgeVerdictStatus(input.status);
    if (!status) throw new RejectedJudgeResultError('unknown-status');

    const record = await this.repository.findById(input.submissionId);
    if (!record) throw new RejectedJudgeResultError('unknown-submission');
    if (record.kind !== SubmissionKind.Submit) {
      return { outcome: 'ignored', reason: 'kind-mismatch' };
    }
    if (isTerminal(record.status)) return { outcome: 'ignored', reason: 'already-terminal' };

    const now = this.now();
    const verdict: SubmitVerdict = {
      status,
      score: input.score ?? null,
      passedTests: input.passedTests ?? null,
      totalTests: input.totalTests ?? null,
      runtimeMs: input.runtimeMs ?? null,
      memoryKb: input.memoryKb ?? null,
    };
    const decided = applyVerdict(record, verdict, now);
    const applied = await this.repository.applySubmitVerdictOnce({
      submissionId: record.id,
      verdict,
      stdout: input.stdout,
      stderr: input.stderr,
      compileOutput: input.compileOutput,
      error: input.error,
      acceptedEvent: isOfficiallyAccepted(decided)
        ? {
            eventId: this.generateEventId(),
            occurredAt: now,
            submissionId: record.id,
            userId: record.userId,
            problemId: decided.problemId,
            score: ACCEPTED_PROGRESS_SCORE,
          }
        : null,
      now,
    });
    if (!applied) return { outcome: 'ignored', reason: 'already-terminal' };

    await this.realtime.publishResult(applied.userId, {
      submissionId: applied.publicId,
      kind: SubmissionKind.Submit,
      status,
      ready: true,
    });
    return { outcome: 'applied' };
  }
}
