import { RabbitMqService } from '@app/common';
import { RABBIT_QUEUES } from '@app/contracts';
import type { SubmissionAcceptedEvent } from '@app/contracts';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Progress, ProgressStatus } from './entities/progress.entity';

@Injectable()
export class ProgressConsumer implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMqService,
    @InjectRepository(Progress) private readonly progress: Repository<Progress>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume<SubmissionAcceptedEvent>(RABBIT_QUEUES.learningAccepted, (event) =>
      this.handleAccepted(event),
    );
  }

  private async handleAccepted(event: SubmissionAcceptedEvent): Promise<void> {
    let progress = await this.progress.findOneBy({
      userId: event.userId,
      problemId: event.problemId,
    });
    if (progress?.lastEventId === event.eventId) return;
    progress ??= this.progress.create({ userId: event.userId, problemId: event.problemId });
    progress.status = ProgressStatus.Solved;
    progress.bestScore = Math.max(progress.bestScore ?? 0, event.score);
    progress.solvedAt ??= new Date(event.occurredAt);
    progress.lastEventId = event.eventId;
    await this.progress.save(progress);
  }
}
