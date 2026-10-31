import type { CourseReferenceChecker } from '@learning/modules/courses/application/ports/out/course-repository.port';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CourseTypeOrmReferenceChecker implements CourseReferenceChecker {
  constructor(private readonly dataSource: DataSource) {}

  async hasCourseReferences(courseId: string): Promise<boolean> {
    const rows: Array<{ referenced: boolean }> = await this.dataSource.query(
      `SELECT (EXISTS (SELECT 1 FROM "classes" WHERE "course_id" = $1)
            OR EXISTS (SELECT 1 FROM "assignments" WHERE "course_id" = $1)) AS "referenced"`,
      [courseId],
    );
    return rows[0]?.referenced === true;
  }
}
