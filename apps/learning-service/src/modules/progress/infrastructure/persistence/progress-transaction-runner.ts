import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { Injectable } from '@nestjs/common';

import { ProgressTransactionContext } from './progress-transaction-context';

@Injectable()
export class ProgressTransactionRunner implements TransactionRunner {
  constructor(private readonly context: ProgressTransactionContext) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.current()) return work();
    return this.context.transaction((manager) => this.context.runWith(manager, work));
  }
}
