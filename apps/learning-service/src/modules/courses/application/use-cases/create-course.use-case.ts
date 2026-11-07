import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { Inject, Injectable } from '@nestjs/common';

import type { CreateCourseCommand } from '@/modules/courses/application/command';
import { DuplicateCourseSlugError } from '@/modules/courses/application/errors';
import type { Principal } from '@/modules/courses/application/models';
import type { ICreateCoursePortIn } from '@/modules/courses/application/ports/in';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import {
  CourseAuthorizationService,
  CourseViewAssembler,
} from '@/modules/courses/application/services';
import { COURSE_REPOSITORY, COURSE_TRANSACTION_RUNNER } from '@/modules/courses/course.tokens';
import { Course } from '@/modules/courses/domain';
import type { CourseRepository } from '@/modules/courses/domain/repositories';
import { CreatedBy } from '@/modules/courses/domain/value-objects';

@Injectable()
export class CreateCourseUseCase implements ICreateCoursePortIn {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(principal: Principal, command: CreateCourseCommand): Promise<ManagedCourseResult> {
    this.authorization.requirePermission(principal, 'course:create');
    const course = await this.transactionRunner.run(async () => {
      if (!(await this.repository.isSlugAvailable(command.slug.value))) {
        throw new DuplicateCourseSlugError('Course slug is already in use');
      }
      const created = Course.create({
        slug: command.slug,
        title: command.title,
        description: command.description,
        createdBy: new CreatedBy(principal.userId),
      });
      await this.repository.save(created);
      return created;
    });
    return this.views.toManaged(course);
  }
}
