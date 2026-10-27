import { ApplicationError } from './application.error';

export interface UnknownReference {
  readonly kind: 'topic' | 'tag';
  readonly id: string;
}

export class UnknownReferenceError extends ApplicationError {
  readonly code = 'UNKNOWN_REFERENCE';

  constructor(readonly references: readonly UnknownReference[]) {
    super('One or more referenced topics or tags do not exist');
  }
}
