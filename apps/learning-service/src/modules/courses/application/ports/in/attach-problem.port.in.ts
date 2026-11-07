import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import type { ChapterId, ProblemReference } from '@/modules/courses/domain/value-objects';

export interface IAttachProblemPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    position?: number,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const ATTACH_PROBLEM_PORT_IN = Symbol('ATTACH_PROBLEM_PORT_IN');
