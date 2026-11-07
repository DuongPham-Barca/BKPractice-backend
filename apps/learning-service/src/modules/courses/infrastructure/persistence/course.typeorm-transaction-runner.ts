import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CourseTypeOrmTransactionContext } from '@/modules/courses/infrastructure/persistence/course.typeorm-transaction-context';

@Injectable()
export class CourseTypeOrmTransactionRunner implements TransactionRunner {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: CourseTypeOrmTransactionContext,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.current() !== null) return work();
    return this.dataSource.transaction((manager) => this.context.runWith(manager, work));
  }
}
