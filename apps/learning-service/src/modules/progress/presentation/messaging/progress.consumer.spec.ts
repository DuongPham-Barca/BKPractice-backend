import type { RabbitMqService } from '@app/common';
import { RABBIT_QUEUES } from '@app/contracts';
import { Logger } from '@nestjs/common';

import { ProgressConsumer } from '@/modules/progress/presentation/messaging/progress.consumer';

describe('ProgressConsumer', () => {
  afterEach(() => jest.restoreAllMocks());
  it('subscribes to accepted submissions and delegates the event to the use case', async () => {
    const event = {
      eventId: 'event-1',
      problemId: 'problem-1',
      privatePayload: 'must-not-be-logged',
    };
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const execute = jest.fn().mockResolvedValue('APPLIED');
    let handler: ((payload: unknown) => Promise<void>) | undefined;
    const consume = jest.fn(
      (_queue: string, callback: (payload: unknown) => Promise<void>): Promise<void> => {
        handler = callback;
        return Promise.resolve();
      },
    );
    const consumer = new ProgressConsumer({ consume } as unknown as RabbitMqService, { execute });

    await consumer.onModuleInit();
    expect(consume).toHaveBeenCalledWith(RABBIT_QUEUES.learningAccepted, expect.any(Function));
    await handler?.(event);
    expect(execute).toHaveBeenCalledWith(event);
    expect(log).toHaveBeenCalledWith({
      eventId: 'event-1',
      problemId: 'problem-1',
      result: 'APPLIED',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('must-not-be-logged');
  });

  it('propagates use case failures so RabbitMQ can retry or dead-letter', async () => {
    const failure = new Error('database unavailable');
    let handler: ((payload: unknown) => Promise<void>) | undefined;
    const consume = jest.fn(
      (_queue: string, callback: (payload: unknown) => Promise<void>): Promise<void> => {
        handler = callback;
        return Promise.resolve();
      },
    );
    const consumer = new ProgressConsumer({ consume } as unknown as RabbitMqService, {
      execute: jest.fn().mockRejectedValue(failure),
    });

    await consumer.onModuleInit();
    await expect(handler?.({})).rejects.toBe(failure);
  });
});
