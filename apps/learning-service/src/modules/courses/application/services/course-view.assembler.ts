import { COURSE_PROBLEM_CATALOG } from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { Inject, Injectable } from '@nestjs/common';

import type { CourseProblemCatalog } from '../ports/out/course-problem-catalog.port';
import type {
  LearnerCourseResult,
  LearnerCourseSummaryResult,
  ManagedCourseResult,
  ManagedCourseSummaryResult,
} from '../results/course.results';

import {
  CoursePublishReadinessService,
  uniqueProblemIds,
} from './course-publish-readiness.service';

@Injectable()
export class CourseViewAssembler {
  constructor(
    @Inject(COURSE_PROBLEM_CATALOG) private readonly catalog: CourseProblemCatalog,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  /** Chỉ Problem `PUBLISHED` chưa xoá mềm, giữ thứ tự; Problem khác bị bỏ như chưa từng có (FR-010). */
  async toLearner(course: Course): Promise<LearnerCourseResult> {
    const found = await this.catalog.findByIds(uniqueProblemIds(course));
    return {
      id: course.id.value,
      slug: course.slug.value,
      title: course.title.value,
      description: course.description.value,
      chapters: course.chapters.map((chapter) => ({
        id: chapter.id.value,
        title: chapter.title.value,
        description: chapter.description.value,
        problems: chapter.problemRefs.flatMap((ref) => {
          const problem = found.get(ref.value);
          if (!problem || problem.isDeleted || problem.publishStatus !== 'PUBLISHED') return [];
          return [
            {
              id: problem.id,
              slug: problem.slug,
              title: problem.title,
              problemType: problem.problemType,
              difficulty: problem.difficulty,
            },
          ];
        }),
      })),
    };
  }

  toLearnerSummary(course: Course): LearnerCourseSummaryResult {
    return {
      id: course.id.value,
      slug: course.slug.value,
      title: course.title.value,
      chapterCount: course.chapters.length,
    };
  }

  /** Quản lý: trạng thái từng Problem đã xếp và lỗi readiness (FR-011). */
  async toManaged(course: Course): Promise<ManagedCourseResult> {
    const found = await this.catalog.findByIds(uniqueProblemIds(course));
    const issues = await this.readiness.check(course);
    return {
      id: course.id.value,
      slug: course.slug.value,
      title: course.title.value,
      description: course.description.value,
      status: course.status,
      createdBy: course.createdBy.value,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      deletedAt: course.deletedMarker.deletedAt,
      chapters: course.chapters.map((chapter) => ({
        id: chapter.id.value,
        title: chapter.title.value,
        description: chapter.description.value,
        problems: chapter.problemRefs.map((ref) => {
          const problem = found.get(ref.value);
          return {
            problemId: ref.value,
            slug: problem?.slug ?? null,
            title: problem?.title ?? null,
            publishStatus: problem?.publishStatus ?? null,
            isDeleted: problem?.isDeleted ?? null,
          };
        }),
      })),
      readiness: { ready: issues.length === 0, issues },
    };
  }

  toManagedSummary(course: Course): ManagedCourseSummaryResult {
    return {
      id: course.id.value,
      slug: course.slug.value,
      title: course.title.value,
      status: course.status,
      chapterCount: course.chapters.length,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      deletedAt: course.deletedMarker.deletedAt,
    };
  }
}
