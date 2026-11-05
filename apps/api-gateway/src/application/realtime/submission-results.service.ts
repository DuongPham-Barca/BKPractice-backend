import type { SubmissionRealtimeEnvelope } from '@app/contracts';
import { parseSubmissionRealtimeEnvelope } from '@gateway/application/realtime/submission-result.parser';
import { Injectable, Logger } from '@nestjs/common';

import { SubmissionResultSubscriber, SubmissionSocketLeases } from '@/infrastructure/redis';

@Injectable()
export class SubmissionResultsService {
  private readonly logger = new Logger(SubmissionResultsService.name);
  private readonly handlers = new Set<(envelope: SubmissionRealtimeEnvelope) => void>();

  constructor(
    subscriber: SubmissionResultSubscriber,
    private readonly leases: SubmissionSocketLeases,
  ) {
    subscriber.subscribe((message) => this.forwardResult(message));
  }

  reserveConnection(userId: string, leaseId: string, renew = false): Promise<boolean> {
    return this.leases.reserve(userId, leaseId, renew);
  }

  releaseConnection(userId: string, leaseId: string): Promise<void> {
    return this.leases.release(userId, leaseId);
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
