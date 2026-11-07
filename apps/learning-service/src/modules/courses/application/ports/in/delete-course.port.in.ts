import type { Principal } from '@/modules/courses/application/models';

export interface IDeleteCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<void>;
}

export const DELETE_COURSE_PORT_IN = Symbol('DELETE_COURSE_PORT_IN');
