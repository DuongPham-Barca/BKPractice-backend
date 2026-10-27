export interface SubmissionAcceptedEvent {
  eventId: string;
  occurredAt: string;
  submissionId: string;
  userId: string;
  problemId: string;
  score: number;
}

export const SUBMISSION_NOTIFICATION_KINDS = ['RUN', 'SUBMIT'] as const;
export type SubmissionNotificationKind = (typeof SUBMISSION_NOTIFICATION_KINDS)[number];

export const SUBMISSION_NOTIFICATION_STATUSES = [
  'EXECUTED',
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
] as const;
export type SubmissionNotificationStatus = (typeof SUBMISSION_NOTIFICATION_STATUSES)[number];

export interface SubmissionResultNotification {
  submissionId: string;
  kind: SubmissionNotificationKind;
  status: SubmissionNotificationStatus;
  ready: true;
}

export interface SubmissionRealtimeEnvelope {
  userId: string;
  notification: SubmissionResultNotification;
}
