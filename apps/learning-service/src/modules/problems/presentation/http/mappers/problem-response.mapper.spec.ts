import type {
  ManagedProblemDetailResult,
  ManagedProblemSummaryResult,
  ProblemDetailResult,
  ProblemSummaryResult,
  SoftDeleteProblemResult,
} from '@learning/modules/problems/application/results/problem.results';

import { ProblemResponseMapper } from './problem-response.mapper';

describe('ProblemResponseMapper', () => {
  const mapper = new ProblemResponseMapper();

  it('maps a public summary without timestamps', () => {
    expect(mapper.toPublicSummary(summary())).toEqual({
      id: 'problem-id',
      slug: 'two-sum',
      title: 'Two Sum',
      problemType: 'STANDARD',
      difficulty: 'EASY',
      topics: [{ id: 'topic-id', name: 'Arrays' }],
      tags: [{ id: 'tag-id', name: 'Beginner' }],
      enabledLanguages: ['python'],
    });
  });

  it('maps a public detail including contracts and examples', () => {
    const response = mapper.toPublicDetail(detail());

    expect(response.statement).toBe('Statement');
    expect(response.inputSpecification).toBe('Input');
    expect(response.outputSpecification).toBeNull();
    expect(response.examples).toEqual([{ input: 'a', output: 'b', explanation: null }]);
    expect(response.executionLimits).toEqual({ timeLimitMs: 1_000, memoryLimitMb: 256 });
    expect(response.starterCodes).toEqual([{ language: 'python', sourceCode: 'print(1)' }]);
    expect(response.functionContracts).toEqual([
      {
        language: 'python',
        functionName: 'solve',
        parameters: [{ name: 'n', type: 'int' }],
        returnType: 'int',
      },
    ]);
    expect(response.oopContracts[0]).toEqual({
      language: 'java',
      structure: 'CLASS',
      name: 'Solution',
      constructorContract: {
        access: 'PUBLIC',
        parameters: [{ name: 'n', type: 'int' }],
      },
      methods: [
        {
          name: 'solve',
          access: 'PUBLIC',
          parameters: [{ name: 'n', type: 'int' }],
          returnType: 'int',
        },
      ],
    });
    expect(response.oopContracts[1]?.constructorContract).toBeNull();
    expect(response.sampleTestCases).toEqual([{ input: '1 2', expectedOutput: '3', order: 0 }]);
  });

  it('maps a managed summary and hides deletedAt unless requested', () => {
    const result = mapper.toManagedSummary(managedSummary(), false);

    expect(result.publishStatus).toBe('PUBLISHED');
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(result.readiness).toEqual({
      ready: false,
      issues: [
        { code: 'TITLE_REQUIRED', field: 'title', message: 'A problem title is required' },
        { code: 'PROBLEM_DELETED', message: 'A deleted problem cannot be published' },
      ],
    });
    expect(result).not.toHaveProperty('deletedAt');
    expect(result.testSuiteSummary).toEqual({
      totalCount: 1,
      hiddenCount: 1,
      totalScore: 1,
      totalBytes: 12,
      harnessLanguages: [],
    });
  });

  it('includes deletedAt as an ISO string when requested', () => {
    expect(mapper.toManagedSummary(managedSummary(), true).deletedAt).toBe(
      '2026-01-03T00:00:00.000Z',
    );
    expect(mapper.toManagedSummary(managedSummary({ deletedAt: null }), true).deletedAt).toBeNull();
  });

  it('maps a managed detail with content and inclusion flag', () => {
    const response = mapper.toManagedDetail(managedDetail(), true);

    expect(response.statement).toBe('Statement');
    expect(response.publishStatus).toBe('PUBLISHED');
    expect(response.deletedAt).toBe('2026-01-03T00:00:00.000Z');
    expect(response.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(response.testSuiteSummary?.totalCount).toBe(1);
    expect(response.sampleTestCases).toHaveLength(1);
  });

  it('maps a preview without exposing the test suite summary', () => {
    const response = mapper.toPreviewDetail(managedDetail(), true);

    expect(response.publishStatus).toBe('PUBLISHED');
    expect(response.sampleTestCases).toHaveLength(1);
    expect(response.testSuiteSummary).toBeUndefined();
  });

  it('maps public pages', () => {
    const page = mapper.toPublicPage({ items: [summary()], total: 1, page: 2, limit: 10 });

    expect(page.total).toBe(1);
    expect(page.page).toBe(2);
    expect(page.limit).toBe(10);
    expect(page.items[0]?.id).toBe('problem-id');
  });

  it('maps managed pages with the deletion flag applied to every item', () => {
    const page = mapper.toManagedPage(
      { items: [managedSummary()], total: 1, page: 1, limit: 20 },
      false,
    );

    expect(page.items[0]).not.toHaveProperty('deletedAt');
    expect(page.items[0]?.publishStatus).toBe('PUBLISHED');
  });

  it('maps a soft delete result to an ISO timestamp', () => {
    const result: SoftDeleteProblemResult = {
      id: 'problem-id',
      publishStatus: 'ON_HOLD',
      deletedAt: new Date('2026-01-04T00:00:00.000Z'),
    };

    expect(mapper.toSoftDelete(result)).toEqual({
      id: 'problem-id',
      publishStatus: 'ON_HOLD',
      deletedAt: '2026-01-04T00:00:00.000Z',
    });
  });
});

function summary(): ProblemSummaryResult {
  return {
    id: 'problem-id',
    slug: 'two-sum',
    title: 'Two Sum',
    problemType: 'STANDARD',
    difficulty: 'EASY',
    topics: [{ id: 'topic-id', name: 'Arrays' }],
    tags: [{ id: 'tag-id', name: 'Beginner' }],
    enabledLanguages: ['python'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
}

function detail(): ProblemDetailResult {
  return {
    ...summary(),
    statement: 'Statement',
    inputSpecification: 'Input',
    outputSpecification: null,
    examples: [{ input: 'a', output: 'b', explanation: null }],
    constraints: null,
    executionLimits: { timeLimitMs: 1_000, memoryLimitMb: 256 },
    starterCodes: [{ language: 'python', sourceCode: 'print(1)' }],
    sampleTestCases: [{ input: '1 2', expectedOutput: '3', order: 0 }],
    functionContracts: [
      {
        language: 'python',
        functionName: 'solve',
        parameters: [{ name: 'n', type: 'int' }],
        returnType: 'int',
      },
    ],
    oopContracts: [
      {
        language: 'java',
        structure: 'CLASS',
        name: 'Solution',
        constructorContract: {
          access: 'PUBLIC',
          parameters: [{ name: 'n', type: 'int' }],
        },
        methods: [
          {
            name: 'solve',
            access: 'PUBLIC',
            parameters: [{ name: 'n', type: 'int' }],
            returnType: 'int',
          },
        ],
      },
      {
        language: 'python',
        structure: 'INTERFACE',
        name: 'Swift',
        constructorContract: null,
        methods: [],
      },
    ],
  };
}

function managedSummary(
  overrides: Partial<ManagedProblemSummaryResult> = {},
): ManagedProblemSummaryResult {
  return {
    ...summary(),
    publishStatus: 'PUBLISHED',
    deletedAt: new Date('2026-01-03T00:00:00.000Z'),
    readiness: {
      ready: false,
      issues: [
        { code: 'TITLE_REQUIRED', field: 'title', message: 'A problem title is required' },
        { code: 'PROBLEM_DELETED', message: 'A deleted problem cannot be published' },
      ],
    },
    testSuiteSummary: {
      totalCount: 1,
      hiddenCount: 1,
      totalScore: 1,
      totalBytes: 12,
      harnessLanguages: [],
    },
    ...overrides,
  };
}

function managedDetail(): ManagedProblemDetailResult {
  return {
    ...detail(),
    publishStatus: 'PUBLISHED',
    deletedAt: new Date('2026-01-03T00:00:00.000Z'),
    readiness: { ready: true, issues: [] },
    testSuiteSummary: {
      totalCount: 1,
      hiddenCount: 1,
      totalScore: 1,
      totalBytes: 12,
      harnessLanguages: [],
    },
  };
}
