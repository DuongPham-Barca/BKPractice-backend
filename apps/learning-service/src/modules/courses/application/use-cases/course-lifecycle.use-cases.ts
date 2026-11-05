import {
  CourseHasReferencesError,
  CourseNotFoundError,
} from '@learning/modules/courses/application/errors/application-errors';
import type { Principal } from '@learning/modules/courses/application/models/principal';
import type {
  CourseReferenceChecker,
  CourseRepository,
} from '@learning/modules/courses/application/ports/out/course-repository.port.out';
import type { TransactionRunner } from '@learning/modules/courses/application/ports/out/transaction-runner.port.out';
import type { ManagedCourseResult } from '@learning/modules/courses/application/results/course.results';
import { CourseAuthorizationService } from '@learning/modules/courses/application/services/course-authorization.service';
import { CourseMutationService } from '@learning/modules/courses/application/services/course-mutation.service';
import { CoursePublishReadinessService } from '@learning/modules/courses/application/services/course-publish-readiness.service';
import {
  COURSE_REFERENCE_CHECKER,
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import { InvalidCourseState } from '@learning/modules/courses/domain/errors/domain-validation.error';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PublishCourseUseCase {
  constructor(
    private readonly mutation: CourseMutationService,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  execute(principal: Principal, courseId: string, now = new Date()): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:publish', courseId, async (course) => {
      if (!course.isDraft)
        throw new InvalidCourseState(
          'status',
          `Cannot publish a course with status ${course.status}`,
        );
      await this.readiness.assertReady(course);
      course.publish(now);
    });
  }
}

@Injectable()
export class HoldCourseUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(principal: Principal, courseId: string, now = new Date()): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:hold', courseId, (course) => {
      course.hold(now);
    });
  }
}

@Injectable()
export class RepublishCourseUseCase {
  constructor(
    private readonly mutation: CourseMutationService,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  execute(principal: Principal, courseId: string, now = new Date()): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:republish', courseId, async (course) => {
      if (!course.isOnHold)
        throw new InvalidCourseState(
          'status',
          `Cannot republish a course with status ${course.status}`,
        );
      await this.readiness.assertReady(course);
      course.republish(now);
    });
  }
}

@Injectable()
export class RestoreCourseUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(principal: Principal, courseId: string, now = new Date()): Promise<ManagedCourseResult> {
    return this.mutation.mutate(
      principal,
      'course:restore',
      courseId,
      (course) => {
        course.restore(now);
      },
      { includeDeleted: true },
    );
  }
}

/**
 * `DeleteCourse`: Course `DRAFT` được xoá hẳn khi không bị Class/Assignment tham chiếu; Course
 * `PUBLISHED`/`ON_HOLD` chỉ xoá mềm, giữ nguyên trạng thái để khôi phục (FR-007, FR-018).
 */
@Injectable()
export class DeleteCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_REFERENCE_CHECKER) private readonly checker: CourseReferenceChecker,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(principal: Principal, courseId: string, now = new Date()): Promise<void> {
    this.authorization.requirePermission(principal, 'course:delete');
    await this.transactionRunner.run(async () => {
      const course = await this.repository.loadForUpdate(courseId);
      if (!course) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(course.createdBy.value, principal);
      if (course.isDraft) {
        if (await this.checker.hasCourseReferences(courseId)) {
          throw new CourseHasReferencesError('Course is referenced by a class or assignment');
        }
        const removed = await this.repository.hardDelete(courseId, principal.userId);
        if (!removed) throw new CourseNotFoundError('Course not found');
        return;
      }
      course.softDelete(now);
      await this.repository.save(course);
    });
  }
}
