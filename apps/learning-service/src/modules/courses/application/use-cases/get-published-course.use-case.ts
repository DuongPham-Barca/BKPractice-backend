import { Inject, Injectable } from '@nestjs/common';

import { CourseNotFoundError } from '@/modules/courses/application/errors';
import type { IGetPublishedCoursePortIn } from '@/modules/courses/application/ports/in';
import type { LearnerCourseResult } from '@/modules/courses/application/results';
import { CourseViewAssembler } from '@/modules/courses/application/services';
import { COURSE_REPOSITORY } from '@/modules/courses/course.tokens';
import type { CourseRepository } from '@/modules/courses/domain/repositories';

@Injectable()
export class GetPublishedCourseUseCase implements IGetPublishedCoursePortIn {
  constructor(
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(idOrSlug: string): Promise<LearnerCourseResult> {
    const course = await this.repository.findPublishedByIdOrSlug(idOrSlug);
    if (!course) throw new CourseNotFoundError('Course not found');
    return this.views.toLearner(course);
  }
}
