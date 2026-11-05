import { COURSE_PROBLEM_CATALOG } from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Inject, Injectable } from '@nestjs/common';

import { CourseNotReadyError } from '../errors/application-errors';
import type {
  CourseProblemCatalog,
  ProblemSummary,
} from '../ports/out/course-problem-catalog.port.out';

@Injectable()
export class CoursePublishReadinessService {
  constructor(
    private readonly readiness: CourseReadiness,
    @Inject(COURSE_PROBLEM_CATALOG) private readonly catalog: CourseProblemCatalog,
  ) {}

  /** Mã lỗi readiness của Course theo trạng thái Problem hiện tại (rỗng nếu sẵn sàng). */
  async check(course: Course, found?: ReadonlyMap<string, ProblemSummary>): Promise<string[]> {
    const ids = uniqueProblemIds(course);
    const resolved = found ?? (await this.catalog.findByIds(ids));
    const states = ids.flatMap((id) => {
      const problem = resolved.get(id);
      return problem
        ? [{ problemId: id, publishStatus: problem.publishStatus, isDeleted: problem.isDeleted }]
        : [];
    });
    return this.readiness.check(course, states);
  }

  async assertReady(course: Course, found?: ReadonlyMap<string, ProblemSummary>): Promise<void> {
    const issues = await this.check(course, found);
    if (issues.length > 0) throw new CourseNotReadyError(issues);
  }
}

export function uniqueProblemIds(course: Course): string[] {
  return [...new Set(course.chapters.flatMap((c) => c.problemRefs).map((ref) => ref.value))];
}
