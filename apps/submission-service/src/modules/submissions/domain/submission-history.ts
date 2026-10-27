import type { SubmissionKind } from './submission-record';

export interface SubmissionHistoryFilter {
  readonly kind?: SubmissionKind;
  readonly problemId?: string;
}

/**
 * Keyset position after the last row of a page. `createdAt` is an ISO timestamp kept at the
 * database's microsecond precision; a JS Date would round it and skip or repeat rows.
 */
export interface HistoryCursor {
  readonly createdAt: string;
  readonly publicId: string;
}

export interface HistoryPage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly totalPages: number;
  readonly nextCursor: HistoryCursor | null;
}

export function matchesFilter(
  record: { readonly kind: SubmissionKind; readonly problemId: string | null },
  filter: SubmissionHistoryFilter,
): boolean {
  return (
    (filter.kind === undefined || record.kind === filter.kind) &&
    (filter.problemId === undefined || record.problemId === filter.problemId)
  );
}
