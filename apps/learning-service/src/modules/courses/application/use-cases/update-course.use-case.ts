import { Injectable } from '@nestjs/common';

import type { UpdateCourseCommand } from '../commands/course.commands';
import type { Principal } from '../models/principal';
import type { ManagedCourseResult } from '../results/course.results';
import { CourseMutationService } from '../services/course-mutation.service';
import { CoursePublishReadinessService } from '../services/course-publish-readiness.service';

@Injectable()
export class UpdateCourseUseCase {
  constructor(
    private readonly mutation: CourseMutationService,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  execute(
    principal: Principal,
    courseId: string,
    command: UpdateCourseCommand,
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, async (course) => {
      course.update(command, now);
      if (course.isPublished) await this.readiness.assertReady(course);
    });
  }
}
