import { Logger } from '@nestjs/common';

import type { ExpireStaleSubmissionsUseCase } from '../../application/expire-stale-submissions.use-case';

export const SUBMISSION_WATCHDOG_INTERVAL_MS = 60_000;

interface WatchdogLogger {
  warn(message: string): void;
}

export class SubmissionWatchdog {
  private interval: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    private readonly expireStaleSubmissions: ExpireStaleSubmissionsUseCase,
    private readonly logger: WatchdogLogger = new Logger(SubmissionWatchdog.name),
  ) {}

  onModuleInit(): void {
    void this.sweep();
    this.interval = setInterval(() => void this.sweep(), SUBMISSION_WATCHDOG_INTERVAL_MS);
    this.interval.unref();
  }

  async sweep(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.expireStaleSubmissions.execute();
    } catch {
      this.logger.warn('Submission watchdog sweep failed');
    } finally {
      this.sweeping = false;
    }
  }

  onApplicationShutdown(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
