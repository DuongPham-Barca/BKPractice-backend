import { Inject, Injectable } from '@nestjs/common';

import type { Principal } from '@/modules/progress/application/models';
import {
  LOCAL_COURSE_REPORT_READER,
  REMOTE_COURSE_REPORT_READER,
  type LocalCourseReportReader,
  type RemoteCourseReportReader,
} from '@/modules/progress/application/reports/student-course-report.ports';
import { CourseCompletionCalculator } from '@/modules/progress/domain/services';

export class CourseReportNotFoundError extends Error {}
export class CourseReportForbiddenError extends Error {}

export interface StudentCourseReportItem {
  userId: string;
  studentId: string | null;
  displayName: string | null;
  submissionCount: number;
  completed: number;
  total: number;
  status: 'Chưa có bài tập' | 'Đang học' | 'Hoàn thành';
  chapters: Array<{ chapterId: string; completed: number; total: number }>;
}
export interface StudentCourseReportResult {
  items: StudentCourseReportItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  courseId: string;
}

@Injectable()
export class GetStudentCourseReportUseCase {
  constructor(
    @Inject(LOCAL_COURSE_REPORT_READER) private readonly local: LocalCourseReportReader,
    @Inject(REMOTE_COURSE_REPORT_READER) private readonly remote: RemoteCourseReportReader,
    private readonly calculator: CourseCompletionCalculator,
  ) {}

  async execute(
    principal: Principal,
    courseId: string,
    page: number,
    limit: number,
  ): Promise<StudentCourseReportResult> {
    if (!principal.roles.includes('ADMIN') && !principal.roles.includes('LECTURER'))
      throw new CourseReportForbiddenError();
    if (!principal.permissions.includes('course:read-managed'))
      throw new CourseReportForbiddenError();
    const course = await this.local.loadCourse(courseId);
    if (!course) throw new CourseReportNotFoundError();
    if (!principal.roles.includes('ADMIN') && course.createdBy !== principal.userId)
      throw new CourseReportForbiddenError();

    const roster = await this.remote.loadStudents(page, limit);
    const userIds = roster.items.map((student) => student.userId);
    const visibleProblemIds = [
      ...new Set(course.chapters.flatMap((chapter) => chapter.problemIds)),
    ];
    const [solvedByUser, countRows] = await Promise.all([
      this.local.loadSolved(userIds, visibleProblemIds),
      this.remote.loadSubmissionCounts(userIds, course.submissionProblemIds),
    ]);
    const submissionTotals = new Map<string, number>();
    for (const row of countRows) {
      submissionTotals.set(row.userId, (submissionTotals.get(row.userId) ?? 0) + row.count);
    }
    const items = roster.items.map((student): StudentCourseReportItem => {
      const completion = this.calculator.calculate(
        course,
        solvedByUser.get(student.userId) ?? new Map<string, Date>(),
      );
      return {
        userId: student.userId,
        studentId: student.studentId,
        displayName: student.displayName,
        submissionCount: submissionTotals.get(student.userId) ?? 0,
        completed: completion.solved,
        total: completion.total,
        status:
          completion.total === 0
            ? 'Chưa có bài tập'
            : completion.solved === completion.total
              ? 'Hoàn thành'
              : 'Đang học',
        chapters: completion.chapters.map((chapter) => ({
          chapterId: chapter.chapterId,
          completed: chapter.solved,
          total: chapter.total,
        })),
      };
    });
    return { items, page: roster.page, limit: roster.limit, hasMore: roster.hasMore, courseId };
  }
}
