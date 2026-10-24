import { ApplicationError } from './application.error';

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHENTICATED';

  constructor(message = 'Authentication is required') {
    super(message);
  }
}
