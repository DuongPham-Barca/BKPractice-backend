import type { DataSource, EntityManager } from 'typeorm';

import { getTransactionStorage } from './transaction-storage';

describe('Learning transaction storage', () => {
  it('keeps concurrent request transactions and different DataSources isolated', async () => {
    const dataSource = {} as DataSource;
    const otherDataSource = {} as DataSource;
    const first = { queryRunner: 'first' } as unknown as EntityManager;
    const second = { queryRunner: 'second' } as unknown as EntityManager;
    const storage = getTransactionStorage(dataSource);
    const otherStorage = getTransactionStorage(otherDataSource);
    await Promise.all(
      [first, second].map((manager) =>
        storage.run(manager, async () => {
          await Promise.resolve();
          expect(getTransactionStorage(dataSource).getStore()).toBe(manager);
          expect(otherStorage.getStore()).toBeUndefined();
        }),
      ),
    );
    expect(storage.getStore()).toBeUndefined();
  });
});
