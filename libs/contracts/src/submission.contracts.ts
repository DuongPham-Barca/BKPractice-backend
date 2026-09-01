export interface SubmissionAcceptedEvent {
  eventId: string;
  occurredAt: string;
  submissionId: string;
  userId: string;
  problemId: string;
  score: number;
}
