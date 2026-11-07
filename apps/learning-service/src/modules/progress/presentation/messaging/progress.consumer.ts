import { RabbitMqService } from '@app/common';
import type { SubmissionAcceptedEvent } from '@app/contracts';
import { RABBIT_QUEUES } from '@app/contracts';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { IApplyAcceptedSubmissionPortIn } from '@/modules/progress/application/ports/in';
import { APPLY_ACCEPTED_SUBMISSION_PORT_IN } from '@/modules/progress/application/ports/in';

@Injectable()
export class ProgressConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProgressConsumer.name);
  constructor(
    private readonly rabbit: RabbitMqService,
    @Inject(APPLY_ACCEPTED_SUBMISSION_PORT_IN)
    private readonly applyAcceptedSubmission: IApplyAcceptedSubmissionPortIn,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume(RABBIT_QUEUES.learningAccepted, async (event: unknown) => {
      const result = await this.applyAcceptedSubmission.execute(event);
      // The successful use case has validated these IDs; never log the raw event payload.
      const { eventId, problemId } = event as SubmissionAcceptedEvent;
      this.logger.log({ eventId, problemId, result });
    });
  }
}
