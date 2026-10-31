import {
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { Inject, Injectable } from '@nestjs/common';

import { CourseNotFoundError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import type { ManagedCourseResult } from '../results/course.results';

import { CourseAuthorizationService } from './course-authorization.service';
import { CourseViewAssembler } from './course-view.assembler';

export interface MutationOptions {
  /** Nạp cả Course đã xoá mềm (dùng cho restore). */
  readonly includeDeleted?: boolean;
}

/**
 * Khung chung cho mọi thao tác ghi lên một Course có sẵn: kiểm quyền, mở transaction, khoá dòng
 * (`loadForUpdate`), kiểm sở hữu, áp thay đổi, lưu cả aggregate rồi dựng biểu diễn quản lý.
 * Lỗi ở bất kỳ bước nào trước `save` để nguyên state (FR-016).
 */
@Injectable()
export class CourseMutationService {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async mutate(
    principal: Principal,
    permission: string,
    courseId: string,
    change: (course: Course) => void | Promise<void>,
    options: MutationOptions = {},
  ): Promise<ManagedCourseResult> {
    this.authorization.requirePermission(principal, permission);
    const course = await this.transactionRunner.run(async () => {
      const loaded = await this.repository.loadForUpdate(courseId, options.includeDeleted ?? false);
      if (!loaded) throw new CourseNotFoundError('Course not found');
      this.authorization.requireOwnership(loaded.createdBy.value, principal);
      await change(loaded);
      await this.repository.save(loaded);
      return loaded;
    });
    return this.views.toManaged(course);
  }
}
