import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class ConcurrentModificationError extends ApplicationError {
  readonly code = 'CONCURRENT_MODIFICATION';
}
