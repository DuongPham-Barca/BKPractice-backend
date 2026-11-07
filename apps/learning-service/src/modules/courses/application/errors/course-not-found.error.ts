import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class CourseNotFoundError extends ApplicationError {
  readonly code = 'COURSE_NOT_FOUND';
}
