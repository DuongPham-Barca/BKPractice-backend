export class DomainValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class InvalidCourseState extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidCourseState';
  }
}

export class ProblemAlreadyInCourse extends Error {
  constructor(public readonly problemId: string) {
    super('Problem is already attached to this course');
    this.name = 'ProblemAlreadyInCourse';
  }
}

export class ChapterNotFound extends Error {
  constructor(public readonly chapterId: string) {
    super('Chapter not found');
    this.name = 'ChapterNotFound';
  }
}
