import type {
  SubmissionHistoryRecord,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus } from '../domain/submission-record';

import {
  DEFAULT_PAGE_SIZE,
  ListSubmissionHistoryUseCase,
  MAX_PAGE_SIZE,
} from './list-submission-history.use-case';

const ownerId = 'cc202285-f526-453a-8bf4-62bd17367adf';

function row(
  index: number,
  overrides: Partial<SubmissionHistoryRecord> = {},
): SubmissionHistoryRecord {
  return {
    publicId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    userId: ownerId,
    problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
    kind: SubmissionKind.Submit,
    language: 'python',
    sourceCodeSize: 8,
    status: SubmissionStatus.Accepted,
    score: 100,
    passedTests: 3,
    totalTests: 3,
    runtimeMs: 12,
    memoryKb: 900,
    createdAt: new Date('2026-10-27T06:00:00.000Z'),
    updatedAt: new Date('2026-10-27T06:00:01.000Z'),
    cursorCreatedAt: '2026-10-27T06:00:00.000123Z',
    ...overrides,
  };
}

function repositoryReturning(items: SubmissionHistoryRecord[], total: number) {
  return {
    listByOwner: jest.fn().mockResolvedValue({ items, total }),
  } as unknown as jest.Mocked<SubmissionRepositoryPort>;
}

describe('ListSubmissionHistoryUseCase', () => {
  it('asks for one extra row and returns a cursor at full precision when another page exists', async () => {
    const repository = repositoryReturning([row(3), row(2), row(1)], 7);

    const page = await new ListSubmissionHistoryUseCase(repository).execute({
      ownerId,
      filter: { kind: SubmissionKind.Submit },
      cursor: null,
      limit: 2,
    });

    expect(repository.listByOwner).toHaveBeenCalledWith(
      ownerId,
      { kind: SubmissionKind.Submit },
      null,
      3,
    );
    expect(page.items.map((item) => item.id)).toEqual([row(3).publicId, row(2).publicId]);
    expect(page.total).toBe(7);
    expect(page.totalPages).toBe(4);
    expect(page.nextCursor).toEqual({
      createdAt: '2026-10-27T06:00:00.000123Z',
      publicId: row(2).publicId,
    });
  });

  it('returns no cursor on the last page and an empty page with total 0', async () => {
    const last = await new ListSubmissionHistoryUseCase(repositoryReturning([row(1)], 1)).execute({
      ownerId,
      filter: {},
      cursor: null,
    });
    const empty = await new ListSubmissionHistoryUseCase(repositoryReturning([], 0)).execute({
      ownerId,
      filter: {},
      cursor: null,
    });

    expect(last.nextCursor).toBeNull();
    expect(empty).toEqual({ items: [], total: 0, totalPages: 0, nextCursor: null });
  });

  it('uses the default page size of 20', async () => {
    const repository = repositoryReturning([], 0);

    await new ListSubmissionHistoryUseCase(repository).execute({
      ownerId,
      filter: {},
      cursor: null,
    });

    expect(repository.listByOwner).toHaveBeenCalledWith(ownerId, {}, null, DEFAULT_PAGE_SIZE + 1);
  });

  it.each([0, MAX_PAGE_SIZE + 1, 2.5])('rejects page size %p', async (limit) => {
    const repository = repositoryReturning([], 0);

    await expect(
      new ListSubmissionHistoryUseCase(repository).execute({
        ownerId,
        filter: {},
        cursor: null,
        limit,
      }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(repository.listByOwner).not.toHaveBeenCalled();
  });

  it('drops any row outside the owner or the filter even if the adapter returned it', async () => {
    const foreign = row(9, { userId: '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d' });
    const run = row(8, { kind: SubmissionKind.Run });
    const repository = repositoryReturning([foreign, run, row(1)], 1);

    const page = await new ListSubmissionHistoryUseCase(repository).execute({
      ownerId,
      filter: { kind: SubmissionKind.Submit },
      cursor: null,
    });

    expect(page.items.map((item) => item.id)).toEqual([row(1).publicId]);
  });

  it('lists Run and Submit with their kind and only the approved list fields', async () => {
    const run = row(2, {
      kind: SubmissionKind.Run,
      status: SubmissionStatus.Executed,
      problemId: null,
    });
    const page = await new ListSubmissionHistoryUseCase(
      repositoryReturning([run, row(1)], 2),
    ).execute({
      ownerId,
      filter: {},
      cursor: null,
    });

    expect(page.items.map((item) => item.kind)).toEqual([
      SubmissionKind.Run,
      SubmissionKind.Submit,
    ]);
    expect(Object.keys(page.items[0]!).sort()).toEqual(
      [
        'id',
        'kind',
        'problemId',
        'problemTitle',
        'language',
        'sourceCodeSize',
        'status',
        'score',
        'passedTests',
        'totalTests',
        'runtimeMs',
        'memoryKb',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
    for (const item of page.items) {
      expect(item).not.toHaveProperty('sourceCode');
      expect(item).not.toHaveProperty('stdout');
      expect(item).not.toHaveProperty('stderr');
      expect(item).not.toHaveProperty('userId');
    }
  });

  it('reports result fields as absent, not 0, for a record without a final verdict', async () => {
    const pending = row(1, { status: SubmissionStatus.Queued, score: 0, passedTests: 0 });

    const page = await new ListSubmissionHistoryUseCase(repositoryReturning([pending], 1)).execute({
      ownerId,
      filter: {},
      cursor: null,
    });

    expect(page.items[0]).toMatchObject({
      status: SubmissionStatus.Queued,
      score: null,
      passedTests: null,
      totalTests: null,
      runtimeMs: null,
      memoryKb: null,
    });
  });

  it('keeps an INTERNAL_ERROR record in the list', async () => {
    const failed = row(1, { status: SubmissionStatus.InternalError, score: null });

    const page = await new ListSubmissionHistoryUseCase(repositoryReturning([failed], 1)).execute({
      ownerId,
      filter: {},
      cursor: null,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.status).toBe(SubmissionStatus.InternalError);
  });
});
