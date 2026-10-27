import { Logger } from '@nestjs/common';
import type { RelayAcceptedEventsUseCase } from '@submission/modules/submissions/application/relay-accepted-events.use-case';

export const ACCEPTED_EVENT_RELAY_INTERVAL_MS = 5_000;

interface RelayLogger {
  warn(message: string): void;
}

export class AcceptedEventRelay {
  private interval: NodeJS.Timeout | null = null;
  private relaying = false;

  constructor(
    private readonly relayAcceptedEvents: RelayAcceptedEventsUseCase,
    private readonly logger: RelayLogger = new Logger(AcceptedEventRelay.name),
  ) {}

  onModuleInit(): void {
    void this.relay();
    this.interval = setInterval(() => void this.relay(), ACCEPTED_EVENT_RELAY_INTERVAL_MS);
    this.interval.unref();
  }

  async relay(): Promise<void> {
    if (this.relaying) return;
    this.relaying = true;
    try {
      await this.relayAcceptedEvents.execute();
    } catch {
      this.logger.warn('Accepted event relay failed; pending events stay in the outbox');
    } finally {
      this.relaying = false;
    }
  }

  onApplicationShutdown(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
