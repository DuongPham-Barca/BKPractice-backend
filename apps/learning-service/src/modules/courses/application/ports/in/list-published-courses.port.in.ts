import type { LearnerCourseSummaryResult } from '@/modules/courses/application/results';
import type { CourseListFilter, CoursePage } from '@/modules/courses/domain/repositories';

export interface IListPublishedCoursesPortIn {
  execute(filter: CourseListFilter): Promise<CoursePage<LearnerCourseSummaryResult>>;
}

export const LIST_PUBLISHED_COURSES_PORT_IN = Symbol('LIST_PUBLISHED_COURSES_PORT_IN');
