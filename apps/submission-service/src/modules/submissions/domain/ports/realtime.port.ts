import type { SubmissionKind, TerminalSubmissionStatus } from '../submission-record';

export const REALTIME_PORT = Symbol('RealtimePort');

export interface SubmissionRealtimeNotification {
  readonly submissionId: string;
  readonly kind: SubmissionKind;
  readonly status: TerminalSubmissionStatus;
  readonly ready: true;
}

export interface RealtimePort {
  publishResult(ownerId: string, notification: SubmissionRealtimeNotification): Promise<void>;
}
