import { TestCasePersistenceMapper } from './test-case.persistence-mapper';
import { TestCaseTypeOrmRepository } from './test-case.typeorm-repository';
import type { TypeOrmTransactionContext } from './typeorm-transaction-context';

const PROBLEM_ID = '00000000-0000-4000-8000-000000000001';
const CASE_ID = '00000000-0000-4000-8000-000000000011';

function createRepository(rows: unknown[]) {
  const query = jest.fn() as jest.MockedFunction<
    (sql: string, parameters?: unknown[]) => Promise<unknown[]>
  >;
  query.mockResolvedValue(rows);
  const manager = { query };
  const context = {
    getManager: () => manager,
    requireManager: () => manager,
  } as unknown as TypeOrmTransactionContext;

  return {
    query,
    repository: new TestCaseTypeOrmRepository(context, new TestCasePersistenceMapper()),
  };
}

describe('TestCaseTypeOrmRepository', () => {
  it('returns stable ordered rows for managed reads', async () => {
    const { repository, query } = createRepository([]);

    await repository.listByProblem(PROBLEM_ID);

    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY "display_order" ASC, "id" ASC');
    expect(query.mock.calls[0]?.[1]).toEqual([PROBLEM_ID]);
  });

  it('projects only visible fields for public samples', async () => {
    const samples = [{ input: '1 2', expectedOutput: '3', displayOrder: 0 }];
    const { repository, query } = createRepository(samples);

    await expect(repository.listSamples(PROBLEM_ID)).resolves.toBe(samples);
    expect(query.mock.calls[0]?.[0]).toContain('"is_hidden" = FALSE');
    expect(query.mock.calls[0]?.[0]).not.toContain('"score"');
  });

  it('scopes deletes by problem and returns false when nothing was removed', async () => {
    const { repository, query } = createRepository([]);

    await expect(repository.remove(PROBLEM_ID, CASE_ID)).resolves.toBe(false);
    expect(query.mock.calls[0]?.[1]).toEqual([CASE_ID, PROBLEM_ID]);
  });
});
