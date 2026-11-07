import type { Course } from '@/modules/courses/domain';
import { DomainValidationError } from '@/modules/courses/domain/errors';

export interface ProblemStateForReadiness {
  readonly problemId: string;
  readonly publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD';
  readonly isDeleted: boolean;
}

export class CourseReadiness {
  check(course: Course, problemStates: readonly ProblemStateForReadiness[]): string[] {
    const issues: string[] = [];
    if (course.title.value.trim().length === 0) issues.push('TITLE_REQUIRED');
    if (course.chapters.length === 0) issues.push('CHAPTER_REQUIRED');
    const publishedProblems = course.chapters
      .flatMap((chapter) => chapter.problemRefs)
      .map((ref) => problemStates.find((state) => state.problemId === ref.value))
      .filter(
        (state) => state !== undefined && state.publishStatus === 'PUBLISHED' && !state.isDeleted,
      );
    if (publishedProblems.length === 0) issues.push('PUBLISHED_PROBLEM_REQUIRED');
    return issues;
  }

  isReady(course: Course, problemStates: readonly ProblemStateForReadiness[]): boolean {
    return this.check(course, problemStates).length === 0;
  }
}

export class ProblemAttachPolicy {
  isAttachable(problemState: ProblemStateForReadiness | undefined): boolean {
    return problemState !== undefined && !problemState.isDeleted;
  }

  assertAttachable(problemState: ProblemStateForReadiness | undefined): void {
    if (!this.isAttachable(problemState)) {
      throw new DomainValidationError('problemId', 'Problem is not attachable');
    }
  }
}
