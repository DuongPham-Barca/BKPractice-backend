import { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_QUEUES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import type { JudgeRequest } from '@app/contracts';
import { Injectable, OnModuleInit } from '@nestjs/common';

import { JudgeEngine } from './judge.engine';

@Injectable()
export class JudgeConsumer implements OnModuleInit {
  constructor(
    private readonly rabbit: RabbitMqService,
    private readonly engine: JudgeEngine,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consume<JudgeRequest>(RABBIT_QUEUES.judgeRequests, async (request) => {
      const result = await this.engine.judge(request);
      await this.rabbit.publish(
        RABBIT_EXCHANGES.submission,
        RABBIT_ROUTING_KEYS.judgeResult,
        result,
        { messageId: result.executionId },
      );
    });
  }
}
