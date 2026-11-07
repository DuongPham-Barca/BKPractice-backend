import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface IRepublishCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}

export const REPUBLISH_COURSE_PORT_IN = Symbol('REPUBLISH_COURSE_PORT_IN');
