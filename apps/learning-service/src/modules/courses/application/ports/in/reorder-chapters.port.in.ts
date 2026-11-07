import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import type { ChapterId } from '@/modules/courses/domain/value-objects';

export interface IReorderChaptersPortIn {
  execute(
    principal: Principal,
    courseId: string,
    orderedIds: readonly ChapterId[],
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const REORDER_CHAPTERS_PORT_IN = Symbol('REORDER_CHAPTERS_PORT_IN');
