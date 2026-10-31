import {
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { ChapterTitle, ChapterDescription } from '@learning/modules/courses/domain/value-objects';
import { ChapterId } from '@learning/modules/courses/domain/value-objects';
import { Inject, Injectable } from '@nestjs/common';

import { CourseNotFoundError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';

export interface AddChapterResult {
  readonly course: Course;
  readonly chapterId: ChapterId;
}

@Injectable()
export class AddChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    title: ChapterTitle,
    description: ChapterDescription | null = null,
    now = new Date(),
  ): Promise<AddChapterResult> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      const chapterId = course.addChapter({ title, description }, now);
      await this.repository.save(course);
      return { course, chapterId };
    });
  }
}

@Injectable()
export class UpdateChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    title: ChapterTitle | undefined,
    description: ChapterDescription | undefined,
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.updateChapter(chapterId, { title, description }, now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class RemoveChapterUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.removeChapter(chapterId, now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class ReorderChaptersUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    orderedIds: readonly ChapterId[],
    now = new Date(),
  ): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:update');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.reorderChapters(orderedIds, now);
      await this.repository.save(course);
      return course;
    });
  }
}
