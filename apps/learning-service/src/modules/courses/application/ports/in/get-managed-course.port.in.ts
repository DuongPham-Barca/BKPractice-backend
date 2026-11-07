import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface IGetManagedCoursePortIn {
  execute(
    principal: Principal,
    courseId: string,
    includeDeleted: boolean,
  ): Promise<ManagedCourseResult>;
}

export const GET_MANAGED_COURSE_PORT_IN = Symbol('GET_MANAGED_COURSE_PORT_IN');
