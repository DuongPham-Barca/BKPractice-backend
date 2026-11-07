import type { CreateCourseCommand } from '@/modules/courses/application/command';
import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';

export interface ICreateCoursePortIn {
  execute(principal: Principal, command: CreateCourseCommand): Promise<ManagedCourseResult>;
}

export const CREATE_COURSE_PORT_IN = Symbol('CREATE_COURSE_PORT_IN');
