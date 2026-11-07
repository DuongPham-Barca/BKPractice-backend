import type { UpdateCourseCommand } from '@/modules/courses/application/command';
import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface IUpdateCoursePortIn {
  execute(
    principal: Principal,
    courseId: string,
    command: UpdateCourseCommand,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const UPDATE_COURSE_PORT_IN = Symbol('UPDATE_COURSE_PORT_IN');
