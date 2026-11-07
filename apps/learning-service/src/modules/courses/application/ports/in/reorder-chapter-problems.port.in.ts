import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import type { ChapterId, ProblemReference } from '@/modules/courses/domain/value-objects';

export interface IReorderChapterProblemsPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    orderedIds: readonly ProblemReference[],
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const REORDER_CHAPTER_PROBLEMS_PORT_IN = Symbol('REORDER_CHAPTER_PROBLEMS_PORT_IN');
