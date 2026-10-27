import type { DataSource, EntityManager } from 'typeorm';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';
import { TypeOrmTransactionRunner } from './typeorm-transaction-runner';

describe('TypeOrmTransactionRunner', () => {
  it('opens a transaction, exposes its manager, and commits on success', async () => {
    const manager = { id: 'manager' } as unknown as EntityManager;
    const { dataSource, transaction, committed } = fakeDataSource(manager);
    const context = new TypeOrmTransactionContext(dataSource);
    const runner = new TypeOrmTransactionRunner(dataSource, context);

    const result = await runner.run(async () => {
      expect(context.current()).toBe(manager);
      expect(context.requireManager()).toBe(manager);

      return 42;
    });

    expect(result).toBe(42);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(committed()).toBe(1);
    expect(context.current()).toBeNull();
  });

  it('propagates errors and clears the context after rollback', async () => {
    const manager = { id: 'manager' } as unknown as EntityManager;
    const { dataSource, rolledBack } = fakeDataSource(manager);
    const context = new TypeOrmTransactionContext(dataSource);
    const runner = new TypeOrmTransactionRunner(dataSource, context);

    await expect(
      runner.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(rolledBack()).toBe(1);
    expect(context.current()).toBeNull();
  });

  it('reuses the active manager for nested calls without opening another transaction', async () => {
    const manager = { id: 'manager' } as unknown as EntityManager;
    const { dataSource, transaction } = fakeDataSource(manager);
    const context = new TypeOrmTransactionContext(dataSource);
    const runner = new TypeOrmTransactionRunner(dataSource, context);

    await runner.run(async () => {
      const inner = await runner.run(async () => context.current());

      expect(inner).toBe(manager);
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(context.current()).toBeNull();
  });

  it('clears the context after a nested failure', async () => {
    const manager = { id: 'manager' } as unknown as EntityManager;
    const { dataSource } = fakeDataSource(manager);
    const context = new TypeOrmTransactionContext(dataSource);
    const runner = new TypeOrmTransactionRunner(dataSource, context);

    await expect(
      runner.run(async () => runner.run(async () => Promise.reject(new Error('inner')))),
    ).rejects.toThrow('inner');

    expect(context.current()).toBeNull();
  });

  it('rejects requireManager outside an active transaction', () => {
    const context = new TypeOrmTransactionContext({} as DataSource);

    expect(() => context.requireManager()).toThrow('Problem write requires an active transaction');
    expect(context.current()).toBeNull();
  });
});

function fakeDataSource(manager: EntityManager): {
  dataSource: DataSource;
  transaction: jest.Mock;
  committed: () => number;
  rolledBack: () => number;
} {
  let commitCount = 0;
  let rollbackCount = 0;
  const transaction = jest.fn(
    async (work: (transactionManager: EntityManager) => Promise<unknown>) => {
      try {
        const result = await work(manager);
        commitCount += 1;

        return result;
      } catch (error) {
        rollbackCount += 1;
        throw error;
      }
    },
  );

  return {
    dataSource: { transaction } as unknown as DataSource,
    transaction,
    committed: () => commitCount,
    rolledBack: () => rollbackCount,
  };
}
