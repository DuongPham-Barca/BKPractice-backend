import { Injectable } from '@nestjs/common';

import type { CourseStructureReader } from '@/modules/progress/application/ports/out';
import type { VisibleCourseStructure } from '@/modules/progress/domain/services';
import { ProgressTransactionContext } from '@/modules/progress/infrastructure/persistence';

interface StructureRow {
  courseId: string;
  chapterId: string | null;
  problemId: string | null;
}
@Injectable()
export class CourseStructureTypeOrmReader implements CourseStructureReader {
  constructor(private readonly context: ProgressTransactionContext) {}
  async loadVisibleStructure(courseId: string): Promise<VisibleCourseStructure | null> {
    const rows = await this.context.getManager().query<StructureRow[]>(
      `SELECT c.id AS "courseId", ch.id AS "chapterId", p.id AS "problemId"
       FROM courses c
       LEFT JOIN chapters ch ON ch.course_id = c.id
       LEFT JOIN chapter_problems cp ON cp.chapter_id = ch.id AND cp.course_id = c.id
       LEFT JOIN problems p ON p.id = cp.problem_id AND p.publish_status = 'PUBLISHED' AND p.deleted_at IS NULL
       WHERE c.id = $1::uuid AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
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
    return { courseId: rows[0]!.courseId, chapters: [...chapters.values()] };
  }
}
