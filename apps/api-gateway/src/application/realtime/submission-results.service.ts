import type { SubmissionRealtimeEnvelope } from '@app/contracts';
import { parseSubmissionRealtimeEnvelope } from '@gateway/application/realtime/submission-result.parser';
import { SubmissionResultSubscriber } from '@gateway/infrastructure/redis/submission-result.subscriber';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubmissionResultsService {
  private readonly logger = new Logger(SubmissionResultsService.name);
  private readonly handlers = new Set<(envelope: SubmissionRealtimeEnvelope) => void>();

  constructor(subscriber: SubmissionResultSubscriber) {
    subscriber.subscribe((message) => this.forwardResult(message));
  }

  subscribe(handler: (envelope: SubmissionRealtimeEnvelope) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private forwardResult(message: string): void {
    const envelope = parseSubmissionRealtimeEnvelope(message);
    if (!envelope) {
      this.logger.warn('Invalid realtime result message');
      return;
    }
    this.handlers.forEach((handler) => handler(envelope));
  }
}
