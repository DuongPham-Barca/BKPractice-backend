import type { Principal } from '@/modules/progress/application/models';
import type { CourseProgressResult } from '@/modules/progress/application/results';
export interface IGetMyCourseProgressPortIn {
  execute(principal: Principal, courseId: string): Promise<CourseProgressResult>;
}
export const GET_MY_COURSE_PROGRESS_PORT_IN = Symbol('GET_MY_COURSE_PROGRESS_PORT_IN');
