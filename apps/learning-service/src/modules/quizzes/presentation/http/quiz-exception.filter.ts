import type { ExceptionFilter } from '@nestjs/common';
import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { UnauthorizedError } from '@/modules/problems/application/errors/unauthorized.error';
import { QuizError } from '@/modules/quizzes/domain';
@Catch()
export class QuizExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QuizExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let message: unknown = 'Unable to process Quiz request';
    if (error instanceof QuizError) {
      status = { INVALID: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UNAVAILABLE: 503 }[
        error.code
      ];
      message = error.message;
    } else if (error instanceof UnauthorizedError) {
      status = 401;
      message = 'Authentication required';
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.getResponse();
    } else this.logger.error('Quiz operation failed');
    response.status(status).json({ statusCode: status, message });
  }
}
