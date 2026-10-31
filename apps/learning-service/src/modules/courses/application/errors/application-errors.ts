export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHORIZED';
}
export class ForbiddenError extends ApplicationError {
  readonly code = 'FORBIDDEN';
}
export class CourseNotFoundError extends ApplicationError {
  readonly code = 'COURSE_NOT_FOUND';
}
export class ChapterNotFoundError extends ApplicationError {
  readonly code = 'CHAPTER_NOT_FOUND';
}
export class ProblemNotAttachableError extends ApplicationError {
  readonly code = 'PROBLEM_NOT_ATTACHABLE';
}
export class DuplicateProblemInCourseError extends ApplicationError {
  readonly code = 'DUPLICATE_PROBLEM_IN_COURSE';
}
export class CourseNotReadyError extends ApplicationError {
  readonly code = 'COURSE_NOT_READY';
  constructor(readonly issues: readonly string[]) {
    super('Course is not ready to publish');
  }
}
export class CourseHasReferencesError extends ApplicationError {
  readonly code = 'COURSE_HAS_REFERENCES';
}
export class ConcurrentModificationError extends ApplicationError {
  readonly code = 'CONCURRENT_MODIFICATION';
}
