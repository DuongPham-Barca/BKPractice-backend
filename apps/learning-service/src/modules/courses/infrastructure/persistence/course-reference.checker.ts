import type { CourseReferenceChecker } from '@learning/modules/courses/application/ports/out/course-repository.port.out';
import { Injectable } from '@nestjs/common';

import { CourseTypeOrmTransactionContext } from './course.typeorm-transaction-context';

@Injectable()
export class CourseTypeOrmReferenceChecker implements CourseReferenceChecker {
  constructor(private readonly context: CourseTypeOrmTransactionContext) {}

  async hasCourseReferences(courseId: string): Promise<boolean> {
    const rows: Array<{ referenced: boolean }> = await this.context.requireManager().query(
      `SELECT (EXISTS (SELECT 1 FROM "classes" WHERE "course_id" = $1)
            OR EXISTS (SELECT 1 FROM "assignments" WHERE "course_id" = $1)) AS "referenced"`,
      [courseId],
    );
    return rows[0]?.referenced === true;
  }
}
