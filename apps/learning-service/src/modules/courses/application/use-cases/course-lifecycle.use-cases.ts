import {
  COURSE_REFERENCE_CHECKER,
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { InvalidCourseState } from '@learning/modules/courses/domain/errors/domain-validation.error';
import { Inject, Injectable } from '@nestjs/common';

import { CourseHasReferencesError, CourseNotFoundError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseReferenceChecker, CourseRepository } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';
import { CoursePublishReadinessService } from '../services/course-publish-readiness.service';

@Injectable()
export class PublishCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly readiness: CoursePublishReadinessService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:publish');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      await this.readiness.assertReady(course);
      course.publish(now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class HoldCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:hold');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.hold(now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class RepublishCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly readiness: CoursePublishReadinessService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:republish');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      await this.readiness.assertReady(course);
      course.republish(now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class SoftDeleteCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:delete');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.softDelete(now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class RestoreCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:restore');
    return this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId, true);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      course.restore(now);
      await this.repository.save(course);
      return course;
    });
  }
}

@Injectable()
export class HardDeleteCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_REFERENCE_CHECKER) private readonly checker: CourseReferenceChecker,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string): Promise<void> {
    this.authorization.requirePermission(principal, 'course:delete');
    await this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId, true);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      if (!course.isDraft) {
        throw new InvalidCourseState('status', 'Only a draft course can be hard-deleted');
      }
      if (await this.checker.hasCourseReferences(courseId)) {
        throw new CourseHasReferencesError('Course is referenced by a class or assignment');
      }
      const ok = await this.repository.hardDelete(courseId, principal.userId);
      if (!ok) throw new CourseNotFoundError('Course not found');
    });
  }
}
