import type { DataSource, EntityManager } from 'typeorm';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';

describe('TypeOrmTransactionContext', () => {
  it('uses the data source manager outside a transaction', () => {
    const manager = managerNamed('default');
    const context = new TypeOrmTransactionContext(dataSourceWith(manager));

    expect(context.current()).toBeNull();
    expect(context.getManager()).toBe(manager);
    expect(() => context.requireManager()).toThrow('Problem write requires an active transaction');
  });

  it('scopes a manager to the async work and restores the previous scope', async () => {
    const defaultManager = managerNamed('default');
    const outer = managerNamed('outer');
    const inner = managerNamed('inner');
    const context = new TypeOrmTransactionContext(dataSourceWith(defaultManager));

    await context.runWith(outer, async () => {
      expect(context.current()).toBe(outer);
      expect(context.getManager()).toBe(outer);
      expect(context.requireManager()).toBe(outer);

      await context.runWith(inner, async () => {
        expect(context.current()).toBe(inner);
        expect(context.requireManager()).toBe(inner);
      });

      expect(context.current()).toBe(outer);
    });

    expect(context.current()).toBeNull();
    expect(context.getManager()).toBe(defaultManager);
  });

  it('keeps concurrent transaction scopes isolated', async () => {
    const first = managerNamed('first');
    const second = managerNamed('second');
    const context = new TypeOrmTransactionContext(dataSourceWith(managerNamed('default')));

    const results = await Promise.all([
      context.runWith(first, async () => {
        await Promise.resolve();
        return context.requireManager();
      }),
      context.runWith(second, async () => {
        await Promise.resolve();
        return context.requireManager();
      }),
    ]);

    expect(results).toEqual([first, second]);
  });
});

function managerNamed(name: string): EntityManager {
  return { name } as unknown as EntityManager;
}

function dataSourceWith(manager: EntityManager): DataSource {
  return { manager } as unknown as DataSource;
}
