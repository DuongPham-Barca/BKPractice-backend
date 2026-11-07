import { randomUUID } from 'node:crypto';

import { RabbitMqService } from '@app/common';
import type { SubmissionAcceptedEvent } from '@app/contracts';
import { RABBIT_EXCHANGES, RABBIT_QUEUES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';
import type { Channel, ChannelModel, GetMessage } from 'amqplib';
import { DataSource } from 'typeorm';

import { ProgressConsumer } from './progress.consumer';

import {
  assertTestDatabase,
  learningDataSourceOptions,
  TEST_DATABASE_URL,
} from '@/modules/courses/testing';
import { ApplyAcceptedSubmissionUseCase } from '@/modules/progress/application/use-cases';
import {
  ProgressTransactionContext,
  ProgressTransactionRunner,
  ProgressTypeOrmRepository,
} from '@/modules/progress/infrastructure/persistence';

assertTestDatabase();
const TEST_RABBITMQ_URL = process.env.TEST_RABBITMQ_URL;
if (TEST_RABBITMQ_URL) {
  const url = new URL(TEST_RABBITMQ_URL);
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !decodeURIComponent(url.pathname).endsWith('_test')
  ) {
    throw new Error('TEST_RABBITMQ_URL must use a local isolated vhost ending with _test');
  }
}
const describeIntegration = TEST_DATABASE_URL && TEST_RABBITMQ_URL ? describe : describe.skip;

async function waitUntil<T>(read: () => Promise<T>, accept: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const value = await read();
    if (accept(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error('Timed out waiting for the isolated Progress message');
}

describeIntegration('ProgressConsumer (real RabbitMQ and PostgreSQL)', () => {
  let dataSource: DataSource;
  let rabbit: RabbitMqService;
  let connection: ChannelModel;
  let channel: Channel;
  let repository: ProgressTypeOrmRepository;
  const outcomes: Array<'APPLIED' | 'DUPLICATE'> = [];
  const events: SubmissionAcceptedEvent[] = [];

  function makeEvent(): SubmissionAcceptedEvent {
    const event = {
      eventId: randomUUID(),
      submissionId: randomUUID(),
      userId: randomUUID(),
      problemId: randomUUID(),
      occurredAt: '2026-11-07T00:00:00Z',
      score: 100,
    };
    events.push(event);
    return event;
  }
  const publish = (event: SubmissionAcceptedEvent) =>
    rabbit.publish(RABBIT_EXCHANGES.learning, RABBIT_ROUTING_KEYS.submissionAccepted, event, {
      messageId: event.eventId,
    });
  const receiptCount = (eventId: string) =>
    dataSource.query<Array<{ event_id: string }>>(
      'SELECT event_id FROM progress_event_receipts WHERE event_id = $1',
      [eventId],
    );
  async function readDeadLetter(): Promise<GetMessage> {
    const message = await waitUntil(
      () => channel.get(RABBIT_QUEUES.learningAcceptedDead, { noAck: false }),
      (value) => value !== false,
    );
    if (!message) throw new Error('Missing dead-letter message');
    return message;
  }

  beforeAll(async () => {
    dataSource = new DataSource(learningDataSourceOptions());
    await dataSource.initialize();
    await dataSource.runMigrations();
    const context = new ProgressTransactionContext(dataSource);
    repository = new ProgressTypeOrmRepository(context);
    const useCase = new ApplyAcceptedSubmissionUseCase(
      repository,
      new ProgressTransactionRunner(context),
    );
    rabbit = new RabbitMqService(new ConfigService({ RABBITMQ_URL: TEST_RABBITMQ_URL }));
    const consumer = new ProgressConsumer(rabbit, {
      execute: async (event) => {
        const result = await useCase.execute(event);
        outcomes.push(result);
        return result;
      },
    });
    await consumer.onModuleInit();
    connection = await amqp.connect(TEST_RABBITMQ_URL!);
    channel = await connection.createChannel();
  }, 30000);
  beforeEach(() => {
    outcomes.length = 0;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await rabbit?.onApplicationShutdown();
    await channel?.close();
    await connection?.close();
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'DELETE FROM progress_event_receipts WHERE event_id = ANY($1::uuid[])',
        [events.map((event) => event.eventId)],
      );
      await dataSource.query('DELETE FROM progress WHERE user_id = ANY($1::uuid[])', [
        events.map((event) => event.userId),
      ]);
      await dataSource.destroy();
    }
  });

  it('acknowledges accepted and duplicate events without modifying progress twice', async () => {
    const event = makeEvent();
    await publish(event);
    await waitUntil(
      async () => [...outcomes],
      (results) => results.length === 1,
    );
    await publish(event);
    expect(
      await waitUntil(
        async () => [...outcomes],
        (results) => results.length === 2,
      ),
    ).toEqual(['APPLIED', 'DUPLICATE']);
    expect(await receiptCount(event.eventId)).toHaveLength(1);
    const rows = await dataSource.query<Array<{ status: string; best_score: number }>>(
      'SELECT status, best_score FROM progress WHERE user_id = $1',
      [event.userId],
    );
    expect(rows).toEqual([{ status: 'SOLVED', best_score: 100 }]);
  });

  it('retries an invalid event three times then sends it to DLQ without changing progress', async () => {
    const event = { ...makeEvent(), score: -1 };
    await publish(event);
    const dead = await readDeadLetter();
    expect(dead.properties.headers?.['x-retry-count']).toBe(3);
    const payload: unknown = JSON.parse(dead.content.toString('utf8'));
    expect(payload).toMatchObject({ eventId: event.eventId, score: -1 });
    channel.ack(dead);
    expect(await receiptCount(event.eventId)).toHaveLength(0);
    expect(
      await dataSource.query<unknown[]>('SELECT id FROM progress WHERE user_id = $1', [
        event.userId,
      ]),
    ).toHaveLength(0);
  });

  it('rolls back on persistence failure and safely replays the dead-letter event after recovery', async () => {
    const event = makeEvent();
    const failure = jest
      .spyOn(repository, 'insertIfAbsent')
      .mockRejectedValue(new Error('simulated-progress-outage'));
    await publish(event);
    const dead = await readDeadLetter();
    expect(dead.properties.headers?.['x-retry-count']).toBe(3);
    expect(failure).toHaveBeenCalledTimes(4);
    expect(await receiptCount(event.eventId)).toHaveLength(0);
    channel.ack(dead);
    failure.mockRestore();
    await publish(event);
    await waitUntil(
      async () => [...outcomes],
      (results) => results.length === 1,
    );
    await publish(event);
    expect(
      await waitUntil(
        async () => [...outcomes],
        (results) => results.length === 2,
      ),
    ).toEqual(['APPLIED', 'DUPLICATE']);
    expect(await receiptCount(event.eventId)).toHaveLength(1);
  });
});
