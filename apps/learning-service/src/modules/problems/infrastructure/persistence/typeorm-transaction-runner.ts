import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class TypeOrmTransactionRunner implements TransactionRunner {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: TypeOrmTransactionContext,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.current() !== null) {
      return work();
    }

    return this.dataSource.transaction((manager) => this.context.runWith(manager, work));
  }
}
