import { AsyncLocalStorage } from 'node:async_hooks';

import type { DataSource, EntityManager } from 'typeorm';

const storageByDataSource = new WeakMap<DataSource, AsyncLocalStorage<EntityManager>>();

/** Share a transaction across Learning modules without sharing state across databases or requests. */
export function getTransactionStorage(dataSource: DataSource): AsyncLocalStorage<EntityManager> {
  let storage = storageByDataSource.get(dataSource);
  if (!storage) {
    storage = new AsyncLocalStorage<EntityManager>();
    storageByDataSource.set(dataSource, storage);
  }
  return storage;
}
