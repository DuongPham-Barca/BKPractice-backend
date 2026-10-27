import type { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_ROUTING_KEYS } from '@app/contracts';

import { SubmissionKind } from '../../domain/submission-record';

import { RabbitJudgeJobAdapter } from './rabbit-judge-job.adapter';

describe('RabbitJudgeJobAdapter', () => {
  it('publishes one RUN JudgeRequest and uses executionId as messageId', async () => {
    const rabbit = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitMqService>;
    const adapter = new RabbitJudgeJobAdapter(rabbit);

    await adapter.publish({
      submissionId: '46d6e5b8-5f66-43d8-9a28-419865604fb1',
      kind: SubmissionKind.Run,
      language: 'python',
      sourceCode: 'print(input())',
      stdin: 'hello',
      timeLimitMs: 3_000,
      memoryLimitMb: 256,
    });

    expect(rabbit.publish).toHaveBeenCalledTimes(1);
    const [exchange, routingKey, request, options] = rabbit.publish.mock.calls[0]!;
    expect(exchange).toBe(RABBIT_EXCHANGES.judge);
    expect(routingKey).toBe(RABBIT_ROUTING_KEYS.judgeRequest);
    expect(request).toMatchObject({
      submissionId: '46d6e5b8-5f66-43d8-9a28-419865604fb1',
      mode: 'RUN',
      problemType: 'STANDARD',
      language: 'python',
      sourceCode: 'print(input())',
      testCases: [{ stdin: 'hello' }],
      timeLimitMs: 3_000,
      memoryLimitMb: 256,
    });
    expect(request).not.toHaveProperty('expectedOutput');
    expect(options).toEqual({ messageId: (request as { executionId: string }).executionId });
  });

  it('publishes one SUBMIT JudgeRequest built only from the Learning package', async () => {
    const rabbit = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RabbitMqService>;
    const testCases = [{ id: 'case-1', stdin: '2 3', expectedOutput: '5', score: 100 }];

    await new RabbitJudgeJobAdapter(rabbit).publish({
      submissionId: '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
      kind: SubmissionKind.Submit,
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      language: 'cpp',
      sourceCode: 'int main() {}',
      judgePackage: {
        problemType: 'FUNCTION',
        timeLimitMs: 2_000,
        memoryLimitMb: 128,
        hiddenHarness: 'harness',
        testCases,
      },
    });

    const [, , request, options] = rabbit.publish.mock.calls[0]!;
    expect(request).toMatchObject({
      submissionId: '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
      mode: 'SUBMIT',
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      problemType: 'FUNCTION',
      language: 'cpp',
      sourceCode: 'int main() {}',
      testCases,
      hiddenHarness: 'harness',
      timeLimitMs: 2_000,
      memoryLimitMb: 128,
    });
    expect(options).toEqual({ messageId: (request as { executionId: string }).executionId });
  });
});
