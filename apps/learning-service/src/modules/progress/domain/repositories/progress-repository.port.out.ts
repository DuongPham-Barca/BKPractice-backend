import type { AcceptedSubmission } from '@/modules/progress/domain';
import type { ProblemProgress } from '@/modules/progress/domain';
import type { SolvedProblem } from '@/modules/progress/domain/services';

export interface SolvedProblemPage {
  readonly items: readonly SolvedProblem[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}
export interface ProgressRepository {
  findSolved(userId: string, problemIds: readonly string[]): Promise<ReadonlyMap<string, Date>>;
  /** Only currently published, non-deleted Problems count toward pagination and total. */
  listSolved(userId: string, page: number, limit: number): Promise<SolvedProblemPage>;
  recordReceipt(event: AcceptedSubmission): Promise<boolean>;
  insertIfAbsent(progress: ProblemProgress): Promise<boolean>;
  loadForUpdate(userId: string, problemId: string): Promise<ProblemProgress | null>;
  save(progress: ProblemProgress): Promise<void>;
}
