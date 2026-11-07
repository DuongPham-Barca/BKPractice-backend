import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class ForbiddenError extends ApplicationError {
  readonly code = 'FORBIDDEN';
}
