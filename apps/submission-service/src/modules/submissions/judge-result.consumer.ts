import { randomUUID } from 'node:crypto';

import { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_QUEUES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import type { JudgeResult, SubmissionAcceptedEvent } from '@app/contracts';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  Submission,
  SubmissionKind,
  SubmissionResult,
  SubmissionStatus,
} from './entities/submission.entity';
import { SubmissionRealtimePublisher } from './submission-realtime.publisher';

@Injectable()
export class JudgeResultConsumer implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly dataSource: DataSource,
    private readonly realtime: SubmissionRealtimePublisher,
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume<JudgeResult>(RABBIT_QUEUES.submissionResults, (result) =>
      this.handleResult(result),
    );
  }

  private async handleResult(result: JudgeResult): Promise<void> {
    const submission = await this.submissions.findOneByOrFail({ id: result.submissionId });
    if (this.isTerminal(submission.status)) {
      await this.publishAcceptedIfNeeded(submission);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      submission.status = result.status as SubmissionStatus;
      submission.score = result.score ?? 0;
      submission.passedTests = result.passedTests ?? null;
      submission.totalTests = result.totalTests ?? null;
      submission.runtimeMs = result.runtimeMs ?? null;
      submission.memoryKb = result.memoryKb ?? null;
      if (
        submission.kind === SubmissionKind.Submit &&
        result.status === 'ACCEPTED' &&
        submission.problemId
      ) {
        submission.acceptedEventId ??= randomUUID();
      }
      await manager.save(submission);
      await manager.save(
        SubmissionResult,
        manager.create(SubmissionResult, {
          submission,
          stdout: result.stdout ?? null,
          stderr: result.stderr ?? null,
          compileOutput: result.compileOutput ?? null,
          error: result.error ?? null,
        }),
      );
    });

    await this.publishAcceptedIfNeeded(submission);
    await this.realtime.emitResult(submission.userId, result);
  }

  private async publishAcceptedIfNeeded(submission: Submission): Promise<void> {
    if (
      submission.kind !== SubmissionKind.Submit ||
      submission.status !== SubmissionStatus.Accepted ||
      !submission.problemId ||
      !submission.acceptedEventId ||
      submission.progressEventPublishedAt
    ) {
      return;
    }
    const event: SubmissionAcceptedEvent = {
      eventId: submission.acceptedEventId,
      occurredAt: submission.updatedAt.toISOString(),
      submissionId: submission.id,
      userId: submission.userId,
      problemId: submission.problemId,
      score: submission.score || 100,
    };
    await this.rabbit.publish(
      RABBIT_EXCHANGES.learning,
      RABBIT_ROUTING_KEYS.submissionAccepted,
      event,
      { messageId: event.eventId },
    );
    submission.progressEventPublishedAt = new Date();
    await this.submissions.save(submission);
  }

  private isTerminal(status: SubmissionStatus): boolean {
    return ![SubmissionStatus.Pending, SubmissionStatus.Queued, SubmissionStatus.Running].includes(
      status,
    );
  }
}
