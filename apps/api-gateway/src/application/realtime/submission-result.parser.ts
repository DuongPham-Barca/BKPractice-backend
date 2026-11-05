import { SUBMISSION_NOTIFICATION_KINDS, SUBMISSION_NOTIFICATION_STATUSES } from '@app/contracts';
import type { SubmissionRealtimeEnvelope, SubmissionResultNotification } from '@app/contracts';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSubmissionRealtimeEnvelope(
  message: string,
): SubmissionRealtimeEnvelope | null {
  try {
    const value = JSON.parse(message) as unknown;
    if (!value || typeof value !== 'object') return null;
    const envelope = value as Record<string, unknown>;
    if (typeof envelope.userId !== 'string' || !uuidV4.test(envelope.userId)) return null;
    if (!envelope.notification || typeof envelope.notification !== 'object') return null;

    const candidate = envelope.notification as Record<string, unknown>;
    if (
      typeof candidate.submissionId !== 'string' ||
      !uuidV4.test(candidate.submissionId) ||
      typeof candidate.kind !== 'string' ||
      !SUBMISSION_NOTIFICATION_KINDS.includes(
        candidate.kind as (typeof SUBMISSION_NOTIFICATION_KINDS)[number],
      ) ||
      typeof candidate.status !== 'string' ||
      !SUBMISSION_NOTIFICATION_STATUSES.includes(
        candidate.status as (typeof SUBMISSION_NOTIFICATION_STATUSES)[number],
      ) ||
      candidate.ready !== true
    ) {
      return null;
    }

    const notification: SubmissionResultNotification = {
      submissionId: candidate.submissionId,
      kind: candidate.kind as SubmissionResultNotification['kind'],
      status: candidate.status as SubmissionResultNotification['status'],
      ready: true,
    };
    return { userId: envelope.userId, notification };
  } catch {
    return null;
  }
}
