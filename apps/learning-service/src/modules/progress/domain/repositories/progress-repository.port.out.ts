import type { AcceptedSubmission } from '@learning/modules/progress/domain/accepted-submission';
import type { ProblemProgress } from '@learning/modules/progress/domain/problem-progress';

export interface ProgressRepository {
  recordReceipt(event: AcceptedSubmission): Promise<boolean>;
  insertIfAbsent(progress: ProblemProgress): Promise<boolean>;
  loadForUpdate(userId: string, problemId: string): Promise<ProblemProgress | null>;
  save(progress: ProblemProgress): Promise<void>;
}
