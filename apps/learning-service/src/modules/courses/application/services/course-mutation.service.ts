import { CourseNotFoundError } from '@learning/modules/courses/application/errors/application-errors';
import type { Principal } from '@learning/modules/courses/application/models/principal';
import type { CourseRepository } from '@learning/modules/courses/application/ports/out/course-repository.port.out';
import type { TransactionRunner } from '@learning/modules/courses/application/ports/out/transaction-runner.port.out';
import type { ManagedCourseResult } from '@learning/modules/courses/application/results/course.results';
import {
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { Inject, Injectable } from '@nestjs/common';

import { CourseAuthorizationService } from './course-authorization.service';
import { CourseViewAssembler } from './course-view.assembler';

export interface MutationOptions {
  /** Nạp cả Course đã xoá mềm (dùng cho restore). */
  readonly includeDeleted?: boolean;
}

/**
 * Khung chung cho mọi thao tác ghi lên một Course có sẵn: kiểm quyền, mở transaction, khoá dòng
 * (`loadForUpdate`), áp thay đổi, lưu cả aggregate rồi dựng biểu diễn quản lý.
 * Biểu diễn quản lý được dựng trong transaction để lỗi đọc catalog cũng rollback thay vì trả 500
 * sau khi đã commit. Lỗi ở bất kỳ bước nào để nguyên state (FR-016).
 *
 * `mutateVoid` dùng cho route trả 204 để không dựng biểu diễn mà client không dùng.
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
    return this.transactionRunner.run(async () => {
      const course = await this.apply(principal, courseId, change, options);
      return this.views.toManaged(course);
    });
  }

  async mutateVoid(
    principal: Principal,
    permission: string,
    courseId: string,
    change: (course: Course) => void | Promise<void>,
    options: MutationOptions = {},
  ): Promise<void> {
    this.authorization.requirePermission(principal, permission);
    await this.transactionRunner.run(async () => {
      await this.apply(principal, courseId, change, options);
    });
  }

  private async apply(
    principal: Principal,
    courseId: string,
    change: (course: Course) => void | Promise<void>,
    options: MutationOptions,
  ): Promise<Course> {
    const loaded = await this.repository.loadForUpdate(courseId, options.includeDeleted ?? false);
    if (!loaded) throw new CourseNotFoundError('Course not found');
    await change(loaded);
    await this.repository.save(loaded);
    return loaded;
  }
}
