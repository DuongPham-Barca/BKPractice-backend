import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class DuplicateCourseSlugError extends ApplicationError {
  readonly code = 'DUPLICATE_COURSE_SLUG';
}
