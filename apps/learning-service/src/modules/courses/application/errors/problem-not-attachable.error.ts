import { ApplicationError } from '@/modules/courses/application/errors/application.error';

export class ProblemNotAttachableError extends ApplicationError {
  readonly code = 'PROBLEM_NOT_ATTACHABLE';
}
