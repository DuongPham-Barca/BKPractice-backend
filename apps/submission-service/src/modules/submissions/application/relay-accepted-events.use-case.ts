import type { AcceptedEventOutboxPort } from '../domain/ports/accepted-event-outbox.port';
import type { AcceptedEventPort } from '../domain/ports/accepted-event.port';

export const ACCEPTED_EVENT_RELAY_BATCH_SIZE = 20;

export class RelayAcceptedEventsUseCase {
  constructor(
    private readonly outbox: AcceptedEventOutboxPort,
    private readonly events: AcceptedEventPort,
  ) {}

  // Each event commits on its own, so a broker failure stops the batch without
  // rolling back events that were already confirmed.
  async execute(): Promise<number> {
    let relayed = 0;
    while (
      relayed < ACCEPTED_EVENT_RELAY_BATCH_SIZE &&
      (await this.outbox.relayOldestPendingAcceptedEvent((event) => this.events.publish(event)))
    ) {
      relayed += 1;
    }
    return relayed;
  }
}
