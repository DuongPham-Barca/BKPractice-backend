import type { UpdateCourseCommand } from '@learning/modules/courses/application/commands/course.commands';
import type { Principal } from '@learning/modules/courses/application/models/principal';
import type { IUpdateCoursePortIn } from '@learning/modules/courses/application/ports/in/course-use-cases.port.in';
import type { ManagedCourseResult } from '@learning/modules/courses/application/results/course.results';
import { CourseMutationService } from '@learning/modules/courses/application/services/course-mutation.service';
import { CoursePublishReadinessService } from '@learning/modules/courses/application/services/course-publish-readiness.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateCourseUseCase implements IUpdateCoursePortIn {
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
