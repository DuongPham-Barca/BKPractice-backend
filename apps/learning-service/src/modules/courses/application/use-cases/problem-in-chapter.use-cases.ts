import {
  COURSE_REPOSITORY,
  COURSE_REFERENCE_CHECKER,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { ProblemReference } from '@learning/modules/courses/domain/value-objects';
import { ChapterId } from '@learning/modules/courses/domain/value-objects';
import { Inject, Injectable } from '@nestjs/common';

import {
  CourseNotFoundError,
  ProblemNotAttachableError,
  DuplicateProblemInCourseError,
} from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { CourseReferenceChecker } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';

@Injectable()
export class AddProblemToChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_REFERENCE_CHECKER) private readonly checker: CourseReferenceChecker,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      const info = await this.checker.isProblemAttachable(problemId.value, principal.userId);
      if (!info.attachable) throw new ProblemNotAttachableError('Problem is not attachable');
      try {
        course.addProblemToChapter(chapterId, problemId, now);
      } catch (e) {
        if (e instanceof Error && e.message === 'Problem already in course')
          throw new DuplicateProblemInCourseError(e.message);
        throw e;
      }
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class RemoveProblemFromChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.removeProblemFromChapter(chapterId, problemId, now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class ReorderProblemsInChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    orderedIds: readonly ProblemReference[],
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.reorderProblemsInChapter(chapterId, orderedIds, now);
      await this.repository.save(course);
      return course;
    });
  }
}
