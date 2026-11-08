import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { UnauthorizedError } from '@/modules/problems/application/errors/unauthorized.error';
import {
  CourseReportForbiddenError,
  CourseReportNotFoundError,
} from '@/modules/progress/application/reports/get-student-course-report.use-case';
import { RemoteReportUnavailableError } from '@/modules/progress/infrastructure/reports/remote-course-report.reader';

@Catch()
export class CourseReportExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CourseReportExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const status: HttpStatus =
      error instanceof HttpException
        ? error.getStatus()
        : error instanceof UnauthorizedError
          ? HttpStatus.UNAUTHORIZED
          : error instanceof CourseReportForbiddenError
            ? HttpStatus.FORBIDDEN
            : error instanceof CourseReportNotFoundError
              ? HttpStatus.NOT_FOUND
              : error instanceof RemoteReportUnavailableError
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.INTERNAL_SERVER_ERROR)
      this.logger.error('Unable to build course report');
    const message =
      error instanceof HttpException
        ? error.message
        : status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : status === HttpStatus.SERVICE_UNAVAILABLE
            ? 'Report dependency unavailable'
            : status === HttpStatus.NOT_FOUND
              ? 'Course not found'
              : status === HttpStatus.FORBIDDEN
                ? 'Forbidden'
                : 'Unauthorized';
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
