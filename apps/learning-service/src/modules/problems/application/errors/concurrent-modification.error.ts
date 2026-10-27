import { ApplicationError } from './application.error';

export class ConcurrentModificationError extends ApplicationError {
  readonly code = 'CONCURRENT_MODIFICATION';

  constructor(message = 'The problem was modified by another request') {
    super(message);
  }
}
