import type { ExpireStaleSubmissionsUseCase } from '../../application/expire-stale-submissions.use-case';

import { SubmissionWatchdog } from './submission-watchdog';

describe('SubmissionWatchdog', () => {
  it('prevents overlapping sweeps', async () => {
    let finish: (() => void) | undefined;
    const expire = {
      execute: jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const watchdog = new SubmissionWatchdog(expire as unknown as ExpireStaleSubmissionsUseCase, {
      warn: jest.fn(),
    });

    const first = watchdog.sweep();
    await watchdog.sweep();
    expect(expire.execute).toHaveBeenCalledTimes(1);
    finish?.();
    await first;
  });
});
