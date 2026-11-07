import { Inject, Injectable } from '@nestjs/common';

import type { IListPublishedCoursesPortIn } from '@/modules/courses/application/ports/in';
import type { LearnerCourseSummaryResult } from '@/modules/courses/application/results';
import { CourseViewAssembler } from '@/modules/courses/application/services';
import { COURSE_REPOSITORY } from '@/modules/courses/course.tokens';
import type {
  CourseListFilter,
  CoursePage,
  CourseRepository,
} from '@/modules/courses/domain/repositories';

@Injectable()
export class ListPublishedCoursesUseCase implements IListPublishedCoursesPortIn {
  constructor(
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(filter: CourseListFilter): Promise<CoursePage<LearnerCourseSummaryResult>> {
    const result = await this.repository.listPublished(filter);
    return { ...result, items: result.items.map((c) => this.views.toLearnerSummary(c)) };
  }
}
