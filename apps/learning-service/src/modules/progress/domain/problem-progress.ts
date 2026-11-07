import type { AcceptedSubmission } from '@/modules/progress/domain/accepted-submission';

export interface ProblemProgressSnapshot {
  readonly userId: string;
  readonly problemId: string;
  readonly bestScore: number;
  readonly solvedAt: Date;
  readonly lastEventId: string;
}

export class ProblemProgress {
  private constructor(private readonly state: ProblemProgressSnapshot) {}

  static firstSolve(event: AcceptedSubmission): ProblemProgress {
    return new ProblemProgress({
      userId: event.userId,
      problemId: event.problemId,
      bestScore: event.score,
      solvedAt: event.occurredAt,
      lastEventId: event.eventId,
    });
  }

  static rehydrate(snapshot: ProblemProgressSnapshot): ProblemProgress {
    return new ProblemProgress(snapshot);
  }

  get userId(): string {
    return this.state.userId;
  }

  get problemId(): string {
    return this.state.problemId;
  }

  get bestScore(): number {
    return this.state.bestScore;
  }

  get solvedAt(): Date {
    return this.state.solvedAt;
  }

  get lastEventId(): string {
    return this.state.lastEventId;
  }

  applyAccepted(event: AcceptedSubmission): ProblemProgress {
    if (event.userId !== this.userId || event.problemId !== this.problemId) {
      throw new Error('Accepted submission does not match progress identity');
    }
    return new ProblemProgress({
      userId: this.userId,
      problemId: this.problemId,
      bestScore: Math.max(this.bestScore, event.score),
      solvedAt: new Date(Math.min(this.solvedAt.getTime(), event.occurredAt.getTime())),
      lastEventId: event.eventId,
    });
  }
}
