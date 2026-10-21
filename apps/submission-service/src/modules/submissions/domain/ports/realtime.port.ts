import type { SubmissionKind, SubmissionStatus } from '../submission-record';

export const REALTIME_PORT = Symbol('RealtimePort');

export interface SubmissionRealtimeNotification {
  readonly submissionId: string;
  readonly kind: SubmissionKind;
  readonly status: SubmissionStatus;
  readonly ready: true;
}

export interface RealtimePort {
  publishResult(ownerId: string, notification: SubmissionRealtimeNotification): Promise<void>;
}
