import { REDIS_CHANNELS } from '@app/contracts';
import { ConfigService } from '@nestjs/config';

import { SubmissionResultSubscriber } from './submission-result.subscriber';

const listeners = new Map<string, (...args: string[]) => void>();
const redis = {
  on: jest.fn((event: string, callback: (...args: string[]) => void) =>
    listeners.set(event, callback),
  ),
  connect: jest.fn().mockRejectedValue(new Error('unavailable')),
  subscribe: jest.fn().mockResolvedValue(1),
  disconnect: jest.fn(),
};
jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn(() => redis) }));

it('subscribes after initial outage, forwards only new messages, and closes without Redis', async () => {
  const subscriber = new SubmissionResultSubscriber(
    new ConfigService({ REDIS_URL: 'redis://localhost' }),
  );
  const receive = jest.fn();
  const unsubscribe = subscriber.subscribe(receive);
  subscriber.onModuleInit();
  await Promise.resolve();
  expect(receive).not.toHaveBeenCalled();
  listeners.get('ready')?.();
  expect(redis.subscribe).toHaveBeenCalledWith(REDIS_CHANNELS.submissionResults);
  listeners.get('message')?.(REDIS_CHANNELS.submissionResults, 'new-message');
  expect(receive).toHaveBeenCalledWith('new-message');
  unsubscribe();
  listeners.get('message')?.(REDIS_CHANNELS.submissionResults, 'later-message');
  expect(receive).toHaveBeenCalledTimes(1);
  subscriber.onApplicationShutdown();
  expect(redis.disconnect).toHaveBeenCalled();
});
