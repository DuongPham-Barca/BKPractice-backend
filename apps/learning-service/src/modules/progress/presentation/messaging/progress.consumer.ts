import { RabbitMqService } from '@app/common';
import { RABBIT_QUEUES } from '@app/contracts';
import type { IApplyAcceptedSubmissionPortIn } from '@learning/modules/progress/application/ports/in/apply-accepted-submission.port.in';
import { APPLY_ACCEPTED_SUBMISSION_PORT_IN } from '@learning/modules/progress/application/ports/in/apply-accepted-submission.port.in';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ProgressConsumer implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMqService,
    @Inject(APPLY_ACCEPTED_SUBMISSION_PORT_IN)
    private readonly applyAcceptedSubmission: IApplyAcceptedSubmissionPortIn,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume(RABBIT_QUEUES.learningAccepted, async (event: unknown) => {
      await this.applyAcceptedSubmission.execute(event);
    });
  }
}
