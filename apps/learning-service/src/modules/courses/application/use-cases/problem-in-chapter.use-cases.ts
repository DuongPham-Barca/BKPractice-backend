import { COURSE_PROBLEM_CATALOG } from '@learning/modules/courses/course.tokens';
import { ProblemAttachPolicy } from '@learning/modules/courses/domain/services/course-readiness';
import type { ChapterId, ProblemReference } from '@learning/modules/courses/domain/value-objects';
import { Inject, Injectable } from '@nestjs/common';

import { ProblemNotAttachableError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseProblemCatalog } from '../ports/out/course-problem-catalog.port';
import type { ManagedCourseResult } from '../results/course.results';
import { CourseMutationService } from '../services/course-mutation.service';
import { CoursePublishReadinessService } from '../services/course-publish-readiness.service';

@Injectable()
export class AttachProblemUseCase {
  private readonly attachPolicy = new ProblemAttachPolicy();

  constructor(
    private readonly mutation: CourseMutationService,
    @Inject(COURSE_PROBLEM_CATALOG) private readonly catalog: CourseProblemCatalog,
  ) {}

  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    position?: number,
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, async (course) => {
      const problem = (await this.catalog.findByIds([problemId.value])).get(problemId.value);
      // Không phân biệt "không tồn tại" với "không được phép" (SR-003, AC-008).
      const attachable = this.attachPolicy.isAttachable(
        problem && {
          problemId: problem.id,
          publishStatus: problem.publishStatus,
          isDeleted: problem.isDeleted,
        },
        principal.userId,
        problem?.createdBy,
      );
      if (!attachable) throw new ProblemNotAttachableError('Problem is not attachable');
      course.addProblemToChapter(chapterId, problemId, now, position);
    });
  }
}

@Injectable()
export class DetachProblemUseCase {
  constructor(
    private readonly mutation: CourseMutationService,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    now = new Date(),
  ): Promise<void> {
    await this.mutation.mutate(principal, 'course:update', courseId, async (course) => {
      course.removeProblemFromChapter(chapterId, problemId, now);
      if (course.isPublished) await this.readiness.assertReady(course);
    });
  }
}

@Injectable()
export class ReorderChapterProblemsUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    orderedIds: readonly ProblemReference[],
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, (course) => {
      course.reorderProblemsInChapter(chapterId, orderedIds, now);
    });
  }
}
