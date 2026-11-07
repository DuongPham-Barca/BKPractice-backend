import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface IPublishCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}

export const PUBLISH_COURSE_PORT_IN = Symbol('PUBLISH_COURSE_PORT_IN');
