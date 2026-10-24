import { ApplicationError } from './application.error';

export class ForbiddenError extends ApplicationError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}
