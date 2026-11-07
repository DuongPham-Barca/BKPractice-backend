import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class CourseNotReadyError extends ApplicationError {
  readonly code = 'COURSE_NOT_READY';
  constructor(readonly issues: readonly string[]) {
    super('Course is not ready to publish');
  }
}
