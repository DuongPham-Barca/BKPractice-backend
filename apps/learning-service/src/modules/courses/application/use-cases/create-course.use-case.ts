import { Course } from '@learning/modules/courses/domain/course.aggregate';
import { CreatedBy } from '@learning/modules/courses/domain/value-objects';
import { Inject, Injectable } from '@nestjs/common';

import { COURSE_REPOSITORY, COURSE_TRANSACTION_RUNNER } from '../../course.tokens';
import type { CreateCourseCommand } from '../commands/course.commands';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { TransactionRunner } from '../ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';

@Injectable()
export class CreateCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
    @Inject(COURSE_TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(principal: Principal, command: CreateCourseCommand): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:create');
    const course = Course.create({
      slug: command.slug,
      title: command.title,
      description: command.description,
      createdBy: new CreatedBy(principal.userId),
    });

    await this.transactionRunner.run(async () => {
      await this.repository.save(course);
    });

    return course;
  }
}
