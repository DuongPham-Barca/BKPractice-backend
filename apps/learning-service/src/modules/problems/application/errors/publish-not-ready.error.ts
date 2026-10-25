import type { PublishIssue } from '@learning/modules/problems/domain/services/problem-contract.validator';

import { ApplicationError } from './application.error';

export class PublishNotReadyError extends ApplicationError {
  readonly code = 'PUBLISH_NOT_READY';

  constructor(readonly issues: readonly PublishIssue[]) {
    super('Problem is not ready to publish');
  }
}
