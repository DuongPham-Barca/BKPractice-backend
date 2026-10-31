import {
  assertTestDatabase,
  learningDataSourceOptions,
  TEST_DATABASE_URL,
  upsertProblem,
} from '@learning/modules/courses/testing/course-db.helpers';
import { DataSource } from 'typeorm';

import { ProblemReferenceReaderAdapter } from './problem-reference-reader.adapter';

assertTestDatabase();
const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

const A = '00000000-0000-4000-8000-0000000000a9';
const B = '00000000-0000-4000-8000-0000000000b9';
const MISSING = '00000000-0000-4000-8000-0000000000f9';

describeIntegration('ProblemReferenceReaderAdapter (real PostgreSQL)', () => {
  let dataSource: DataSource;
  let reader: ProblemReferenceReaderAdapter;

  beforeAll(async () => {
    dataSource = new DataSource(learningDataSourceOptions());
    await dataSource.initialize();
    await dataSource.runMigrations();
    await upsertProblem(dataSource, {
      id: A,
      slug: 'reader-a',
      title: 'A',
      publishStatus: 'PUBLISHED',
    });
    await upsertProblem(dataSource, {
      id: B,
      slug: 'reader-b',
      title: 'B',
      publishStatus: 'ON_HOLD',
      deleted: true,
    });
    reader = new ProblemReferenceReaderAdapter(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('returns summaries for a set of ids, including deleted ones, and skips unknown ids', async () => {
    const found = await reader.getProblemReferences([A, B, MISSING]);

    expect(found.map((p) => p.id).sort()).toEqual([A, B]);
    expect(found.find((p) => p.id === A)).toMatchObject({
      slug: 'reader-a',
      title: 'A',
      problemType: 'STANDARD',
      difficulty: 'EASY',
      publishStatus: 'PUBLISHED',
      isDeleted: false,
    });
    expect(found.find((p) => p.id === B)).toMatchObject({
      publishStatus: 'ON_HOLD',
      isDeleted: true,
    });
  });

  it('exposes no statement, test case or harness data', async () => {
    const [problem] = await reader.getProblemReferences([A]);

    expect(Object.keys(problem!).sort()).toEqual([
      'createdBy',
      'difficulty',
      'id',
      'isDeleted',
      'problemType',
      'publishStatus',
      'slug',
      'title',
    ]);
  });

  it('returns an empty list for an empty input without querying', async () => {
    expect(await reader.getProblemReferences([])).toEqual([]);
  });
});
