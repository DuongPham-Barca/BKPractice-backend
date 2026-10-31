import type { Course } from '../course.aggregate';
import { DomainValidationError } from '../errors/domain-validation.error';

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
  isAttachable(
    problemState: ProblemStateForReadiness | undefined,
    principalUserId: string,
    problemCreatedBy: string | undefined,
  ): boolean {
    if (problemState === undefined || problemState.isDeleted) return false;
    if (problemState.publishStatus === 'PUBLISHED') return true;
    if (problemState.publishStatus === 'DRAFT' || problemState.publishStatus === 'ON_HOLD') {
      return problemCreatedBy === principalUserId;
    }
    return false;
  }

  assertAttachable(
    problemState: ProblemStateForReadiness | undefined,
    principalUserId: string,
    problemCreatedBy: string | undefined,
  ): void {
    if (!this.isAttachable(problemState, principalUserId, problemCreatedBy)) {
      throw new DomainValidationError('problemId', 'Problem is not attachable');
    }
  }
}
