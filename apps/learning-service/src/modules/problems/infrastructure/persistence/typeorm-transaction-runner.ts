import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { TransactionRunner } from '../../application/ports/out/transaction-runner.port.out';

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
