import {
  CourseNotFoundError,
  CourseNotReadyError,
  CourseHasReferencesError,
} from '@learning/modules/courses/application/errors/application-errors';
import {
  DomainValidationError,
  InvalidCourseState,
} from '@learning/modules/courses/domain/errors/domain-validation.error';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

@Catch(DomainValidationError, InvalidCourseState, Error)
export class CourseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    let issues: unknown;

    if (exception instanceof DomainValidationError) status = HttpStatus.BAD_REQUEST;
    else if (exception instanceof CourseNotReadyError) {
      status = HttpStatus.BAD_REQUEST;
      issues = exception.issues;
    } else if (exception instanceof CourseNotFoundError) status = HttpStatus.NOT_FOUND;
    else if (exception instanceof CourseHasReferencesError) status = HttpStatus.CONFLICT;
    else if (exception instanceof InvalidCourseState) status = HttpStatus.CONFLICT;

    response.status(status).json({ statusCode: status, message, ...(issues ? { issues } : {}) });
  }
}
