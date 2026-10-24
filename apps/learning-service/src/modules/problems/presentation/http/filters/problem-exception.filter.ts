import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError } from '../../../application/errors/application.error';
import { ConcurrentModificationError } from '../../../application/errors/concurrent-modification.error';
import { ForbiddenError } from '../../../application/errors/forbidden.error';
import { ProblemNotFoundError } from '../../../application/errors/problem-not-found.error';
import { PublishNotReadyError } from '../../../application/errors/publish-not-ready.error';
import { UnauthorizedError } from '../../../application/errors/unauthorized.error';
import { UnknownReferenceError } from '../../../application/errors/unknown-reference.error';
import { DomainValidationError } from '../../../domain/errors/domain-validation.error';
import { DuplicateSlugError } from '../../../domain/errors/duplicate-slug.error';
import { InvalidProblemState } from '../../../domain/errors/invalid-problem-state.error';

@Catch(DomainValidationError, InvalidProblemState, DuplicateSlugError, ApplicationError)
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(
    exception: DomainValidationError | InvalidProblemState | DuplicateSlugError | ApplicationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusOf(exception);
    const body = new HttpException(exception.message, status).getResponse();

    response
      .status(status)
      .json(
        exception instanceof PublishNotReadyError
          ? { ...(body as object), issues: exception.issues }
          : body,
      );
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
    if (exception instanceof DuplicateSlugError) return HttpStatus.CONFLICT;
    if (exception instanceof InvalidProblemState) return HttpStatus.CONFLICT;
    if (exception instanceof ConcurrentModificationError) return HttpStatus.CONFLICT;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
