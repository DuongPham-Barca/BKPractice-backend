import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface IHoldCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}

export const HOLD_COURSE_PORT_IN = Symbol('HOLD_COURSE_PORT_IN');
