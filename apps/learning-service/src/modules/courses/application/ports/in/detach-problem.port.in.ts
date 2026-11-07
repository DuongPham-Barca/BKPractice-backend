import type { Principal } from '@/modules/courses/application/models';
import type { ChapterId, ProblemReference } from '@/modules/courses/domain/value-objects';

export interface IDetachProblemPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    now?: Date,
  ): Promise<void>;
}

export const DETACH_PROBLEM_PORT_IN = Symbol('DETACH_PROBLEM_PORT_IN');
