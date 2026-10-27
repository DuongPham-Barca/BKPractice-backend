import type { RabbitMqService } from '@app/common';
import { RABBIT_QUEUES, type SubmissionAcceptedEvent } from '@app/contracts';
import type { Repository } from 'typeorm';

import type { Progress } from './entities/progress.entity';
import { ProgressStatus } from './entities/progress.entity';
import { ProgressConsumer } from './progress.consumer';

const EVENT: SubmissionAcceptedEvent = {
  eventId: 'event-1',
  occurredAt: '2026-01-01T00:00:00.000Z',
  submissionId: 'submission-1',
  userId: 'user-1',
  problemId: 'problem-1',
  score: 80,
};

describe('ProgressConsumer', () => {
  it('subscribes to the accepted submission queue on module init', async () => {
    const harness = createHarness(null);

    await harness.consumer.onModuleInit();

    expect(harness.consume).toHaveBeenCalledWith(
      RABBIT_QUEUES.learningAccepted,
      expect.any(Function),
    );
  });

  it('creates progress for a first accepted submission', async () => {
    const harness = createHarness(null);

    await harness.handle(EVENT);

    expect(harness.findOneBy).toHaveBeenCalledWith({
      userId: 'user-1',
      problemId: 'problem-1',
    });
    expect(harness.create).toHaveBeenCalledWith({ userId: 'user-1', problemId: 'problem-1' });
    expect(harness.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProgressStatus.Solved,
        bestScore: 80,
        solvedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastEventId: 'event-1',
      }),
    );
  });

  it('keeps the highest score and the first solvedAt for repeated accepted submissions', async () => {
    const solvedAt = new Date('2025-12-01T00:00:00.000Z');
    const existing = progress({ bestScore: 90, solvedAt, lastEventId: 'older-event' });
    const harness = createHarness(existing);

    await harness.handle(EVENT);

    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProgressStatus.Solved,
        bestScore: 90,
        solvedAt,
        lastEventId: 'event-1',
      }),
    );
  });

  it('fills in a lower score and solvedAt when they were missing', async () => {
    const existing = progress({ bestScore: 0, solvedAt: null, lastEventId: null });
    const harness = createHarness(existing);

    await harness.handle({ ...EVENT, score: 50 });

    expect(harness.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bestScore: 50,
        solvedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('ignores a duplicated event id', async () => {
    const existing = progress({ bestScore: 80, lastEventId: EVENT.eventId });
    const harness = createHarness(existing);

    await harness.handle(EVENT);

    expect(harness.save).not.toHaveBeenCalled();
  });
});

interface Harness {
  consumer: ProgressConsumer;
  consume: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  handle(event: SubmissionAcceptedEvent): Promise<void>;
}

function createHarness(existing: Progress | null): Harness {
  let callback: ((event: SubmissionAcceptedEvent) => Promise<void>) | undefined;
  const consume = jest.fn(
    (_queue: string, handler: (event: SubmissionAcceptedEvent) => Promise<void>): Promise<void> => {
      callback = handler;
      return Promise.resolve();
    },
  );
  const findOneBy = jest.fn().mockResolvedValue(existing);
  const create = jest.fn((input: Partial<Progress>) => progress(input));
  const save = jest.fn().mockResolvedValue(undefined);
  const rabbit = { consume };
  const repository = { findOneBy, create, save };
  const consumer = new ProgressConsumer(
    rabbit as unknown as RabbitMqService,
    repository as unknown as Repository<Progress>,
  );

  return {
    consumer,
    consume,
    findOneBy,
    create,
    save,
    async handle(event: SubmissionAcceptedEvent): Promise<void> {
      await consumer.onModuleInit();

      if (callback === undefined) {
        throw new Error('consumer did not register a handler');
      }

      await callback(event);
    },
  };
}

function progress(overrides: Partial<Progress>): Progress {
  return {
    id: 'progress-1',
    userId: 'user-1',
    problemId: 'problem-1',
    status: ProgressStatus.Attempted,
    bestScore: 0,
    solvedAt: null,
    lastEventId: null,
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
