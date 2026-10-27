import type { RealtimePort } from '../domain/ports/realtime.port';
import type { SubmissionRepositoryPort } from '../domain/ports/submission-repository.port';
import { SubmissionStatus } from '../domain/submission-record';

// SUB-001 and SUB-002 both end a Run or Submit still waiting 10 minutes after creation.
export const SUBMISSION_TIMEOUT_MS = 10 * 60 * 1_000;

export class ExpireStaleSubmissionsUseCase {
  constructor(
    private readonly repository: SubmissionRepositoryPort,
    private readonly realtime: RealtimePort,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - SUBMISSION_TIMEOUT_MS);
    const expired = await this.repository.expireStaleSubmissions(cutoff, now);

    await Promise.all(
      expired.map((submission) =>
        this.realtime.publishResult(submission.userId, {
          submissionId: submission.publicId,
          kind: submission.kind,
          status: SubmissionStatus.InternalError,
          ready: true,
        }),
      ),
    );
    return expired.length;
  }
}
