import type { AcceptedEventOutboxPort } from '../domain/ports/accepted-event-outbox.port';
import type { AcceptedEventPort, AcceptedProgressEvent } from '../domain/ports/accepted-event.port';

import {
  ACCEPTED_EVENT_RELAY_BATCH_SIZE,
  RelayAcceptedEventsUseCase,
} from './relay-accepted-events.use-case';

const event: AcceptedProgressEvent = {
  eventId: '3d1c8b0e-7b0e-4a0e-9f4f-6b8c2b9f0a01',
  occurredAt: new Date('2026-10-27T03:00:00.000Z'),
  submissionId: '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
  userId: 'cc202285-f526-453a-8bf4-62bd17367adf',
  problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
  score: 100,
};

function outboxWith(pending: number) {
  let remaining = pending;
  return {
    relayOldestPendingAcceptedEvent: jest.fn(
      async (publish: (value: AcceptedProgressEvent) => Promise<void>) => {
        if (remaining === 0) return false;
        await publish(event);
        remaining -= 1;
        return true;
      },
    ),
  } as unknown as jest.Mocked<AcceptedEventOutboxPort>;
}

describe('RelayAcceptedEventsUseCase', () => {
  it('publishes every pending event through the port until the outbox is empty', async () => {
    const repository = outboxWith(2);
    const events = { publish: jest.fn().mockResolvedValue(undefined) };

    await expect(
      new RelayAcceptedEventsUseCase(repository, events as AcceptedEventPort).execute(),
    ).resolves.toBe(2);
    expect(events.publish).toHaveBeenCalledTimes(2);
    expect(events.publish).toHaveBeenCalledWith(event);
  });

  it('caps one run at the batch size', async () => {
    const repository = outboxWith(ACCEPTED_EVENT_RELAY_BATCH_SIZE + 5);
    const events = { publish: jest.fn().mockResolvedValue(undefined) };

    await expect(
      new RelayAcceptedEventsUseCase(repository, events as AcceptedEventPort).execute(),
    ).resolves.toBe(ACCEPTED_EVENT_RELAY_BATCH_SIZE);
  });

  it('stops at the first broker failure and leaves the rest pending', async () => {
    const repository = outboxWith(3);
    const events = {
      publish: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('broker down')),
    };

    await expect(
      new RelayAcceptedEventsUseCase(repository, events as AcceptedEventPort).execute(),
    ).rejects.toThrow('broker down');
    expect(repository.relayOldestPendingAcceptedEvent).toHaveBeenCalledTimes(2);
  });
});
