import { ApplicationError } from './application.error';

export class ProblemNotFoundError extends ApplicationError {
  readonly code = 'PROBLEM_NOT_FOUND';

  constructor(readonly problemId: string) {
    super('Problem not found');
  }
}
