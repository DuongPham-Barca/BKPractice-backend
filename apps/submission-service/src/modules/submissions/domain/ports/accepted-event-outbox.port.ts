import type { AcceptedProgressEvent } from './accepted-event.port';

export const ACCEPTED_EVENT_OUTBOX_PORT = Symbol('AcceptedEventOutboxPort');

/** Rows are written by SubmissionRepositoryPort.applySubmitVerdictOnce; this port only drains them. */
export interface AcceptedEventOutboxPort {
  /** Publishes the oldest unpublished accepted event and marks it; false when none is pending. */
  relayOldestPendingAcceptedEvent(
    publish: (event: AcceptedProgressEvent) => Promise<void>,
  ): Promise<boolean>;
}
