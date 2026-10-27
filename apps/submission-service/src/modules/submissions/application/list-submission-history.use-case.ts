import type {
  SubmissionHistoryRecord,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import { matchesFilter } from '../domain/submission-history';
import type {
  HistoryCursor,
  HistoryPage,
  SubmissionHistoryFilter,
} from '../domain/submission-history';
import { isTerminal } from '../domain/submission-record';
import type { SubmissionKind, SubmissionStatus } from '../domain/submission-record';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ListSubmissionHistoryInput {
  readonly ownerId: string;
  readonly filter: SubmissionHistoryFilter;
  readonly cursor: HistoryCursor | null;
  readonly limit?: number;
}

/** The approved list fields (SUB-003 "Lịch sử" column): no source code, diagnostics or raw output. */
export interface SubmissionHistoryItem {
  readonly id: string;
  readonly kind: SubmissionKind;
  readonly problemId: string | null;
  readonly problemTitle: null;
  readonly language: string;
  readonly sourceCodeSize: number;
  readonly status: SubmissionStatus;
  readonly score: number | null;
  readonly passedTests: number | null;
  readonly totalTests: number | null;
  readonly runtimeMs: number | null;
  readonly memoryKb: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class ListSubmissionHistoryUseCase {
  constructor(private readonly repository: SubmissionRepositoryPort) {}

  async execute(input: ListSubmissionHistoryInput): Promise<HistoryPage<SubmissionHistoryItem>> {
    const limit = input.limit ?? DEFAULT_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new RangeError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
    }

    // One extra row tells whether another page exists without a second query.
    const slice = await this.repository.listByOwner(
      input.ownerId,
      input.filter,
      input.cursor,
      limit + 1,
    );
    // Defence in depth: the adapter already filters, but a row outside the owner's scope or the
    // filter must never reach the response.
    const rows = slice.items.filter(
      (row) => row.userId === input.ownerId && matchesFilter(row, input.filter),
    );
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return {
      items: page.map(toHistoryItem),
      total: slice.total,
      totalPages: Math.ceil(slice.total / limit),
      nextCursor:
        rows.length > limit && last
          ? { createdAt: last.cursorCreatedAt, publicId: last.publicId }
          : null,
    };
  }
}

function toHistoryItem(row: SubmissionHistoryRecord): SubmissionHistoryItem {
  // A record without a final verdict reports its result fields as absent, never as 0 (FR-010).
  const judged = isTerminal(row.status);
  return {
    id: row.publicId,
    kind: row.kind,
    problemId: row.problemId,
    problemTitle: null,
    language: row.language,
    sourceCodeSize: row.sourceCodeSize,
    status: row.status,
    score: judged ? row.score : null,
    passedTests: judged ? row.passedTests : null,
    totalTests: judged ? row.totalTests : null,
    runtimeMs: judged ? row.runtimeMs : null,
    memoryKb: judged ? row.memoryKb : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
