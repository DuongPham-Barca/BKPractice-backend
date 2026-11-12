import { Injectable } from '@nestjs/common';

import type {
  LocalCourseReportReader,
  ManagedCourseStructure,
} from '@/modules/progress/application/reports/student-course-report.ports';
import { ProgressTransactionContext } from '@/modules/progress/infrastructure/persistence';

interface CourseRow {
  courseId: string;
  createdBy: string;
  chapterId: string | null;
  problemId: string | null;
}
interface SolvedRow {
  userId: string;
  problemId: string;
  solvedAt: Date;
}

@Injectable()
export class LocalCourseReportReaderAdapter implements LocalCourseReportReader {
  constructor(private readonly context: ProgressTransactionContext) {}

  async loadCourse(courseId: string): Promise<ManagedCourseStructure | null> {
    const rows = await this.context.getManager().query<CourseRow[]>(
      `SELECT c.id AS "courseId", c.created_by AS "createdBy", ch.id AS "chapterId", p.id AS "problemId"
       FROM courses c
       LEFT JOIN chapters ch ON ch.course_id = c.id
       LEFT JOIN chapter_problems cp ON cp.chapter_id = ch.id AND cp.course_id = c.id
       LEFT JOIN problems p ON p.id = cp.problem_id AND p.publish_status = 'PUBLISHED' AND p.deleted_at IS NULL
       WHERE c.id = $1::uuid AND c.deleted_at IS NULL
       ORDER BY ch.display_order, ch.id, cp.display_order, cp.id`,
      [courseId],
    );
    if (!rows.length) return null;
    const chapters = new Map<string, { chapterId: string; problemIds: string[] }>();
    for (const row of rows) {
      if (!row.chapterId) continue;
      let chapter = chapters.get(row.chapterId);
      if (!chapter) {
        chapter = { chapterId: row.chapterId, problemIds: [] };
        chapters.set(row.chapterId, chapter);
      }
      if (row.problemId) chapter.problemIds.push(row.problemId);
    }
    const history = await this.context
      .getManager()
      .query<Array<{ problemId: string }>>(
        'SELECT problem_id AS "problemId" FROM course_problem_history WHERE course_id = $1::uuid ORDER BY problem_id',
        [courseId],
      );
    return {
      courseId: rows[0]!.courseId,
      createdBy: rows[0]!.createdBy,
      chapters: [...chapters.values()],
      submissionProblemIds: history.map((row) => row.problemId),
    };
  }

  async loadSolved(
    userIds: readonly string[],
    problemIds: readonly string[],
  ): Promise<ReadonlyMap<string, ReadonlyMap<string, Date>>> {
    const result = new Map<string, Map<string, Date>>();
    if (!userIds.length || !problemIds.length) return result;
    const rows = await this.context.getManager().query<SolvedRow[]>(
      `SELECT user_id AS "userId", problem_id AS "problemId", solved_at AS "solvedAt"
       FROM progress WHERE user_id = ANY($1::uuid[]) AND problem_id = ANY($2::uuid[])
         AND status = 'SOLVED' AND solved_at IS NOT NULL`,
      [userIds, problemIds],
    );
    for (const row of rows) {
      const byProblem = result.get(row.userId) ?? new Map<string, Date>();
      byProblem.set(row.problemId, row.solvedAt);
      result.set(row.userId, byProblem);
    }
    return result;
  }
}
