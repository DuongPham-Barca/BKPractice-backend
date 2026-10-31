import { COURSE_REFERENCE_CHECKER } from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Inject, Injectable } from '@nestjs/common';

import { CourseNotReadyError } from '../errors/application-errors';
import type { CourseReferenceChecker } from '../ports/out/course-repository.port';

@Injectable()
export class CoursePublishReadinessService {
  constructor(
    private readonly readiness: CourseReadiness,
    @Inject(COURSE_REFERENCE_CHECKER) private readonly checker: CourseReferenceChecker,
  ) {}

  async assertReady(course: Course): Promise<void> {
    const problemStates = await Promise.all(
      course.chapters
        .flatMap((chapter) => chapter.problemRefs)
        .map(async (ref) => {
          const state = await this.checker.getProblemState(ref.value);
          return {
            problemId: ref.value,
            publishStatus: state.publishStatus ?? 'DRAFT',
            isDeleted: state.isDeleted ?? false,
          } as const;
        }),
    );
    const issues = this.readiness.check(course, problemStates);
    if (issues.length > 0) throw new CourseNotReadyError(issues);
  }
}
