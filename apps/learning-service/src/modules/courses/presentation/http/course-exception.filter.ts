import {
  ConcurrentModificationError,
  CourseHasReferencesError,
  CourseNotFoundError,
  CourseNotReadyError,
  DuplicateCourseSlugError,
  ForbiddenError,
  ProblemNotAttachableError,
  UnauthorizedError,
} from '@learning/modules/courses/application/errors/application-errors';
import {
  ChapterNotFound,
  DomainValidationError,
  InvalidCourseState,
  ProblemAlreadyInCourse,
} from '@learning/modules/courses/domain/errors/domain-validation.error';
import { UnauthorizedError as TrustedPrincipalUnauthorizedError } from '@learning/modules/problems/application/errors/unauthorized.error';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Bảng ánh xạ lỗi -> HTTP theo plan LRN-003 (mục "Ánh xạ lỗi").
function statusOf(exception: unknown): HttpStatus {
  if (exception instanceof HttpException) return exception.getStatus();
  if (
    exception instanceof UnauthorizedError ||
    exception instanceof TrustedPrincipalUnauthorizedError
  ) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (exception instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
  if (exception instanceof CourseNotFoundError || exception instanceof ChapterNotFound) {
    return HttpStatus.NOT_FOUND;
  }
  if (
    exception instanceof DomainValidationError ||
    exception instanceof CourseNotReadyError ||
    exception instanceof ProblemNotAttachableError
  ) {
    return HttpStatus.BAD_REQUEST;
  }
  if (
    exception instanceof CourseHasReferencesError ||
    exception instanceof DuplicateCourseSlugError ||
    exception instanceof ProblemAlreadyInCourse ||
    exception instanceof ConcurrentModificationError ||
    exception instanceof InvalidCourseState
  ) {
    return HttpStatus.CONFLICT;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

// HttpException (ví dụ ValidationPipe) mang danh sách lỗi chi tiết trong response body.
function messageOf(exception: unknown): string | string[] {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'object' && body !== null && 'message' in body) {
      return (body as { message: string | string[] }).message;
    }
  }
  return exception instanceof Error ? exception.message : 'Internal server error';
}

@Catch()
export class CourseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CourseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusOf(exception);
    const isKnown = status < HttpStatus.INTERNAL_SERVER_ERROR;
    // Không lộ chi tiết lỗi không lường trước cho client.
    const message = isKnown ? messageOf(exception) : 'Internal server error';
    const issues = exception instanceof CourseNotReadyError ? exception.issues : undefined;

    if (isKnown) {
      this.logger.warn(Array.isArray(message) ? message.join('; ') : message);
    } else {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({ statusCode: status, message, ...(issues ? { issues } : {}) });
  }
}
