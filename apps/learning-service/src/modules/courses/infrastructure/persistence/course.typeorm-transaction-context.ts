import type { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';

import { getTransactionStorage } from '@/infrastructure/persistence';

@Injectable()
export class CourseTypeOrmTransactionContext {
  private readonly storage: AsyncLocalStorage<EntityManager>;

  constructor(private readonly dataSource: DataSource) {
    this.storage = getTransactionStorage(dataSource);
  }

  current(): EntityManager | null {
    return this.storage.getStore() ?? null;
  }

  getManager(): EntityManager {
    return this.current() ?? this.dataSource.manager;
  }

  requireManager(): EntityManager {
    const manager = this.current();
    if (!manager) throw new Error('Course write requires an active transaction');
    return manager;
  }

  runWith<T>(manager: EntityManager, work: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, work);
  }
}
