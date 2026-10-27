import type { JudgeJobPort } from '../domain/ports/judge-job.port';
import type { LearningJudgePackagePort } from '../domain/ports/learning-judge-package.port';
import type { SubmissionRepositoryPort } from '../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus, createSubmitRecord } from '../domain/submission-record';

export interface SubmitCodeInput {
  readonly userId: string;
  readonly problemId: string;
  readonly language: string;
  readonly sourceCode: string;
}

export interface SubmitCodeAcceptance {
  readonly id: string;
  readonly kind: SubmissionKind.Submit;
  readonly status: SubmissionStatus.Queued;
  readonly problemId: string;
  readonly language: string;
  readonly createdAt: Date;
}

export class SubmitCodeUseCase {
  constructor(
    private readonly learning: LearningJudgePackagePort,
    private readonly repository: SubmissionRepositoryPort,
    private readonly judge: JudgeJobPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SubmitCodeInput): Promise<SubmitCodeAcceptance> {
    // Fetched first: a refused or unreachable package must leave no record (SUB-002-FR-021).
    const judgePackage = await this.learning.getPackage(input.problemId, input.language);
    const saved = await this.repository.save(createSubmitRecord({ ...input, now: this.now() }));

    try {
      await this.judge.publish({
        submissionId: saved.id,
        kind: SubmissionKind.Submit,
        problemId: input.problemId,
        language: saved.language,
        sourceCode: saved.sourceCode,
        judgePackage,
      });
    } catch (error: unknown) {
      await this.repository.markFailedToDispatch(saved.id, this.now());
      throw error;
    }

    // A fast verdict may already have moved the record past PENDING; the job is still accepted.
    await this.repository.markQueued(saved.id, this.now());

    return {
      id: saved.publicId,
      kind: SubmissionKind.Submit,
      status: SubmissionStatus.Queued,
      problemId: input.problemId,
      language: saved.language,
      createdAt: saved.createdAt,
    };
  }
}
