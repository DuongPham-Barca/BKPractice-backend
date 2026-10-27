import { RabbitMqService } from '@app/common';
import { RABBIT_QUEUES } from '@app/contracts';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ApplyRunJudgeResultUseCase } from '../application/apply-run-judge-result.use-case';
import { ApplySubmitJudgeResultUseCase } from '../application/apply-submit-judge-result.use-case';

import { parseJudgeResult } from './judge-result.parser';

@Injectable()
export class JudgeResultConsumer implements OnModuleInit {
  private readonly logger = new Logger(JudgeResultConsumer.name);

  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly applyRunResult: ApplyRunJudgeResultUseCase,
    private readonly applySubmitResult: ApplySubmitJudgeResultUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume<unknown>(RABBIT_QUEUES.submissionResults, (payload) =>
      this.handleResult(payload),
    );
  }

  // Throwing NACKs the delivery; RabbitMqService retries it and then dead-letters it.
  async handleResult(payload: unknown): Promise<void> {
    const result = parseJudgeResult(payload);
    if (!result) throw new Error('Malformed judge result');

    const outcome =
      result.mode === 'RUN'
        ? await this.applyRunResult.execute(result)
        : await this.applySubmitResult.execute(result);
    if (outcome.outcome === 'ignored' && outcome.reason !== 'already-terminal') {
      this.logger.warn(`Ignored ${result.mode} judge result: ${outcome.reason}`);
    }
  }
}
