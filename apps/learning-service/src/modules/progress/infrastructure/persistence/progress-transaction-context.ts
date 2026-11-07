import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';

@Injectable()
export class ProgressTransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  current(): EntityManager | null {
    return this.storage.getStore() ?? null;
  }

  requireManager(): EntityManager {
    const manager = this.current();
    if (!manager) throw new Error('Progress write requires an active transaction');
    return manager;
  }

  runWith<T>(manager: EntityManager, work: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, work);
  }

  transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
