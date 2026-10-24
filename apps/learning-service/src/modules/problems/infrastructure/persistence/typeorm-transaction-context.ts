import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';

@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  current(): EntityManager | null {
    return this.storage.getStore() ?? null;
  }

  getManager(): EntityManager {
    return this.current() ?? this.dataSource.manager;
  }

  requireManager(): EntityManager {
    const manager = this.current();

    if (!manager) {
      throw new Error('Problem write requires an active transaction');
    }

    return manager;
  }

  runWith<T>(manager: EntityManager, work: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, work);
  }
}
