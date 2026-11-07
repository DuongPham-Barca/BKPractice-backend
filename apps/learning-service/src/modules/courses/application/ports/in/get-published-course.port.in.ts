import type { LearnerCourseResult } from '@/modules/courses/application/results';

export interface IGetPublishedCoursePortIn {
  execute(idOrSlug: string): Promise<LearnerCourseResult>;
}

export const GET_PUBLISHED_COURSE_PORT_IN = Symbol('GET_PUBLISHED_COURSE_PORT_IN');
