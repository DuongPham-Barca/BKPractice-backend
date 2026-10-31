import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Inject, Injectable } from '@nestjs/common';

import {
  COURSE_REPOSITORY,
  COURSE_REFERENCE_CHECKER,
  COURSE_TRANSACTION_RUNNER,
} from '../../course.tokens';
import {
  CourseNotFoundError,
  CourseNotReadyError,
  CourseHasReferencesError,
} from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { CourseReferenceChecker } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';

@Injectable()
export class PublishCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly readiness: CourseReadiness,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_REFERENCE_CHECKER) private readonly checker: CourseReferenceChecker,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    problemStates: Parameters<CourseReadiness['check']>[1],
    now = new Date(),
  ): Promise<unknown> {
    this.authorization.requirePermission(principal, 'course:publish');
    const course = await this.repository.loadForUpdate(courseId);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    const issues = this.readiness.check(course, problemStates);
    if (issues.length > 0) throw new CourseNotReadyError(issues);
    course.publish(now);
    await this.transactionRunner.run(async () => {
      await this.repository.save(course);
    });
    return course;
  }
}

@Injectable()
export class HoldCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<unknown> {
    this.authorization.requirePermission(principal, 'course:hold');
    const course = await this.repository.loadForUpdate(courseId);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    course.hold(now);
    await this.transactionRunner.run(async () => {
      await this.repository.save(course);
    });
    return course;
  }
}

@Injectable()
export class RepublishCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly readiness: CourseReadiness,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(
    principal: Principal,
    courseId: string,
    problemStates: Parameters<CourseReadiness['check']>[1],
    now = new Date(),
  ): Promise<unknown> {
    this.authorization.requirePermission(principal, 'course:republish');
    const course = await this.repository.loadForUpdate(courseId);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    const issues = this.readiness.check(course, problemStates);
    if (issues.length > 0) throw new CourseNotReadyError(issues);
    course.republish(now);
    await this.transactionRunner.run(async () => {
      await this.repository.save(course);
    });
    return course;
  }
}

@Injectable()
export class SoftDeleteCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<unknown> {
    this.authorization.requirePermission(principal, 'course:delete');
    const course = await this.repository.loadForUpdate(courseId);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    await this.transactionRunner.run(async () => {
      const ok = await this.repository.softDelete(courseId, principal.userId, now);
      if (!ok) throw new CourseNotFoundError('Course not found');
    });
    return this.repository.findByIdIncludingDeleted(courseId);
  }
}

@Injectable()
export class RestoreCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}
  async execute(principal: Principal, courseId: string, now = new Date()): Promise<unknown> {
    this.authorization.requirePermission(principal, 'course:restore');
    const course = await this.repository.loadForUpdate(courseId, true);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    await this.transactionRunner.run(async () => {
      const ok = await this.repository.restore(courseId, principal.userId, now);
      if (!ok) throw new CourseNotFoundError('Course not found');
    });
    return this.repository.findById(courseId);
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
    const course = await this.repository.findByIdIncludingDeleted(courseId);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    if (course.status !== 'DRAFT')
      throw new CourseNotFoundError('Only draft courses can be hard-deleted');
    const hasRefs = await this.checker.hasCourseReferences(courseId);
    if (hasRefs) throw new CourseHasReferencesError('Course is referenced');
    await this.transactionRunner.run(async () => {
      const ok = await this.repository.hardDelete(courseId, principal.userId);
      if (!ok) throw new CourseNotFoundError('Course not found');
    });
  }
}
