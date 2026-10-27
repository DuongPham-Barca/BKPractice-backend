import { ApplicationError } from './application.error';

export class TestCaseNotFoundError extends ApplicationError {
  readonly code = 'TEST_CASE_NOT_FOUND';

  constructor(readonly testCaseId: string) {
    super('Test case not found');
  }
}
