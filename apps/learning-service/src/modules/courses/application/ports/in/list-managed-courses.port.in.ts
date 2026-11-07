import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseSummaryResult } from '@/modules/courses/application/results';
import type { CoursePage } from '@/modules/courses/domain/repositories';

export interface IListManagedCoursesPortIn {
  execute(
    principal: Principal,
    includeDeleted: boolean,
    page: number,
    limit: number,
    search?: string,
  ): Promise<CoursePage<ManagedCourseSummaryResult>>;
}

export const LIST_MANAGED_COURSES_PORT_IN = Symbol('LIST_MANAGED_COURSES_PORT_IN');
