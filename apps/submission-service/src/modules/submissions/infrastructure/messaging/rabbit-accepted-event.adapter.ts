import { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import type { SubmissionAcceptedEvent } from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';

import type {
  AcceptedEventPort,
  AcceptedProgressEvent,
} from '../../domain/ports/accepted-event.port';

@Injectable()
export class RabbitAcceptedEventAdapter implements AcceptedEventPort {
  private readonly logger = new Logger(RabbitAcceptedEventAdapter.name);

  constructor(private readonly rabbit: RabbitMqService) {}

  async publish(event: AcceptedProgressEvent): Promise<void> {
    const message: SubmissionAcceptedEvent = {
      ...event,
      occurredAt: event.occurredAt.toISOString(),
    };
    try {
      await this.rabbit.publish(
        RABBIT_EXCHANGES.learning,
        RABBIT_ROUTING_KEYS.submissionAccepted,
        message,
        { messageId: event.eventId },
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to publish submission.accepted for submission ${event.submissionId} (event ${event.eventId})`,
      );
      throw error;
    }
  }
}
