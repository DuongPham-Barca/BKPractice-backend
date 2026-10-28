import { ApplicationError } from '@learning/modules/problems/application/errors/application.error';
import { ConcurrentModificationError } from '@learning/modules/problems/application/errors/concurrent-modification.error';
import { ForbiddenError } from '@learning/modules/problems/application/errors/forbidden.error';
import { HarnessNotFoundError } from '@learning/modules/problems/application/errors/harness-not-found.error';
import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import { PublishNotReadyError } from '@learning/modules/problems/application/errors/publish-not-ready.error';
import { TestCaseNotFoundError } from '@learning/modules/problems/application/errors/test-case-not-found.error';
import { UnauthorizedError } from '@learning/modules/problems/application/errors/unauthorized.error';
import { UnknownReferenceError } from '@learning/modules/problems/application/errors/unknown-reference.error';
import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';
import { DuplicateSlugError } from '@learning/modules/problems/domain/errors/duplicate-slug.error';
import { InvalidProblemState } from '@learning/modules/problems/domain/errors/invalid-problem-state.error';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

@Catch(DomainValidationError, InvalidProblemState, DuplicateSlugError, ApplicationError)
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(
    exception: DomainValidationError | InvalidProblemState | DuplicateSlugError | ApplicationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusOf(exception);

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      ...(exception instanceof PublishNotReadyError ? { issues: exception.issues } : {}),
    });
  }

  private statusOf(
    exception: DomainValidationError | InvalidProblemState | DuplicateSlugError | ApplicationError,
  ): number {
    if (exception instanceof DomainValidationError) return HttpStatus.BAD_REQUEST;
    if (exception instanceof UnknownReferenceError) return HttpStatus.BAD_REQUEST;
    if (exception instanceof PublishNotReadyError) return HttpStatus.BAD_REQUEST;
    if (exception instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    if (exception instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (exception instanceof ProblemNotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof TestCaseNotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof HarnessNotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof DuplicateSlugError) return HttpStatus.CONFLICT;
    if (exception instanceof InvalidProblemState) return HttpStatus.CONFLICT;
    if (exception instanceof ConcurrentModificationError) return HttpStatus.CONFLICT;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
