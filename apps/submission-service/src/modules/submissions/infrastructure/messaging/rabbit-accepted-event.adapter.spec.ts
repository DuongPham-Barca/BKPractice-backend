import type { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_ROUTING_KEYS } from '@app/contracts';

import { RabbitAcceptedEventAdapter } from './rabbit-accepted-event.adapter';

const event = {
  eventId: '3d1c8b0e-7b0e-4a0e-9f4f-6b8c2b9f0a01',
  occurredAt: new Date('2026-10-27T03:00:00.000Z'),
  submissionId: '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
  userId: 'cc202285-f526-453a-8bf4-62bd17367adf',
  problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
  score: 100,
};

describe('RabbitAcceptedEventAdapter', () => {
  it('publishes the six approved fields with the stable event ID as message ID', async () => {
    const rabbit = { publish: jest.fn().mockResolvedValue(undefined) };

    await new RabbitAcceptedEventAdapter(rabbit as unknown as RabbitMqService).publish(event);

    expect(rabbit.publish).toHaveBeenCalledWith(
      RABBIT_EXCHANGES.learning,
      RABBIT_ROUTING_KEYS.submissionAccepted,
      { ...event, occurredAt: '2026-10-27T03:00:00.000Z' },
      { messageId: event.eventId },
    );
  });

  it('rethrows a broker failure so the outbox row stays pending', async () => {
    const rabbit = { publish: jest.fn().mockRejectedValue(new Error('unconfirmed')) };

    await expect(
      new RabbitAcceptedEventAdapter(rabbit as unknown as RabbitMqService).publish(event),
    ).rejects.toThrow('unconfirmed');
  });
});
