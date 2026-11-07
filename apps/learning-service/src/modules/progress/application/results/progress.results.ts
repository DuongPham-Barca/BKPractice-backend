export interface SolvedStatusResult {
  readonly problemId: string;
  readonly solved: boolean;
  readonly solvedAt: Date | null;
}
export type { CourseCompletion as CourseProgressResult } from '@/modules/progress/domain/services';
