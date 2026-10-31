import {
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import { Course } from '@learning/modules/courses/domain/course.aggregate';
import { CreatedBy } from '@learning/modules/courses/domain/value-objects';
import { Inject, Injectable } from '@nestjs/common';

import type { CreateCourseCommand } from '../commands/course.commands';
import { DuplicateCourseSlugError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import type { ManagedCourseResult } from '../results/course.results';
import { CourseAuthorizationService } from '../services/course-authorization.service';
import { CourseViewAssembler } from '../services/course-view.assembler';

@Injectable()
export class CreateCourseUseCase {
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
