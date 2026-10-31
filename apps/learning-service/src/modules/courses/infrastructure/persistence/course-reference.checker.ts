import type { CourseReferenceChecker } from '@learning/modules/courses/application/ports/out/course-repository.port';
import type { ProblemReferenceReader } from '@learning/modules/problems/application/ports/out/problem-reference-reader.port.out';
import { PROBLEM_REFERENCE_READER } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CourseTypeOrmReferenceChecker implements CourseReferenceChecker {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(PROBLEM_REFERENCE_READER) private readonly problemReader: ProblemReferenceReader,
  ) {}

  async isProblemAttachable(problemId: string, principalUserId: string) {
    const info = await this.problemReader.getProblemReference(problemId);
    const attachable =
      info.publishStatus !== undefined &&
      info.isDeleted === false &&
      (info.publishStatus === 'PUBLISHED' || info.createdBy === principalUserId);
    return {
      attachable,
      createdBy: info.createdBy,
      publishStatus: info.publishStatus,
      isDeleted: info.isDeleted,
    };
  }

  async getProblemState(problemId: string) {
    const info = await this.problemReader.getProblemReference(problemId);
    return { publishStatus: info.publishStatus, isDeleted: info.isDeleted };
  }

  async hasCourseReferences(courseId: string): Promise<boolean> {
    const rows: Array<{ referenced: boolean }> = await this.dataSource.query(
      `SELECT (EXISTS (SELECT 1 FROM "classes" WHERE "course_id" = $1)
            OR EXISTS (SELECT 1 FROM "assignments" WHERE "course_id" = $1)) AS "referenced"`,
      [courseId],
    );
    return rows[0]?.referenced === true;
  }
}
