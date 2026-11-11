import { Inject, Injectable } from '@nestjs/common';

import { CourseNotFoundError } from '@/modules/courses/application/errors';
import type { Principal } from '@/modules/courses/application/models';
import type { IDetachQuizPortIn } from '@/modules/courses/application/ports/in/detach-quiz.port.in';
import type { CourseQuizCatalog } from '@/modules/courses/application/ports/out';
import { COURSE_QUIZ_CATALOG } from '@/modules/courses/application/ports/out';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import {
  CourseAuthorizationService,
  CourseViewAssembler,
} from '@/modules/courses/application/services';
import { COURSE_REPOSITORY, COURSE_TRANSACTION_RUNNER } from '@/modules/courses/course.tokens';
import type { CourseRepository } from '@/modules/courses/domain/repositories';
import { ChapterId } from '@/modules/courses/domain/value-objects';
import type { TransactionRunner } from '@/modules/problems/application/ports/out';
@Injectable()
export class DetachQuizUseCase implements IDetachQuizPortIn {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
    @Inject(COURSE_QUIZ_CATALOG) private readonly catalog: CourseQuizCatalog,
  ) {}
  async execute(
    p: Principal,
    courseId: string,
    chapterId: string,
    quizId: string,
  ): Promise<ManagedCourseResult> {
    this.authorization.requirePermission(p, 'course:update');
    return this.tx.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwner(p, course.createdBy.value);
      course.detachQuiz(ChapterId.from(chapterId), quizId);
      await this.repository.save(course);
      return this.views.toManaged(course);
    });
  }
}
