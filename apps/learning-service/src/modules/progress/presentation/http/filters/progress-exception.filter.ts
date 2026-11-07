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
import { CourseProgressNotFoundError } from '@/modules/progress/application/errors';

@Catch()
export class ProgressExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProgressExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const status: HttpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof UnauthorizedError
          ? HttpStatus.UNAUTHORIZED
          : exception instanceof CourseProgressNotFoundError
            ? HttpStatus.NOT_FOUND
            : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Unexpected error while reading personal progress');
    } else if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const detail: unknown =
        typeof body === 'object' && body !== null && 'message' in body ? body.message : body;
      message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail) &&
              detail.every((value): value is string => typeof value === 'string')
            ? detail
            : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
