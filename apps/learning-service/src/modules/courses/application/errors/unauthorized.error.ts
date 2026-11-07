import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHORIZED';
}
