import type { JudgeJobPort } from '../../submissions/domain/ports/judge-job.port';
import type { SubmissionRepositoryPort } from '../../submissions/domain/ports/submission-repository.port';
import {
  SubmissionKind,
  SubmissionStatus,
  createRunRecord,
} from '../../submissions/domain/submission-record';

export interface RunCodeInput {
  readonly userId: string;
  readonly problemId?: string | null;
  readonly language: string;
  readonly sourceCode: string;
  readonly stdin: string;
}

export interface RunCodeAcceptance {
  readonly id: string;
  readonly kind: SubmissionKind.Run;
  readonly status: SubmissionStatus.Queued;
  readonly language: string;
  readonly createdAt: Date;
}

export class RunCodeUseCase {
  constructor(
    private readonly repository: SubmissionRepositoryPort,
    private readonly judge: JudgeJobPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: RunCodeInput): Promise<RunCodeAcceptance> {
    const saved = await this.repository.save(createRunRecord({ ...input, now: this.now() }));

    try {
      await this.judge.publish({
        submissionId: saved.id,
        kind: SubmissionKind.Run,
        language: saved.language,
        sourceCode: saved.sourceCode,
        stdin: saved.stdin,
        timeLimitMs: 3_000,
        memoryLimitMb: 256,
      });
    } catch (error: unknown) {
      await this.repository.markFailedToDispatch(saved.id, this.now());
      throw error;
    }

    const queued = await this.repository.markQueued(saved.id, this.now());
    if (!queued) throw new Error('Run was no longer pending after judge dispatch');

    return {
      id: queued.publicId,
      kind: SubmissionKind.Run,
      status: SubmissionStatus.Queued,
      language: queued.language,
      createdAt: queued.createdAt,
    };
  }
}
