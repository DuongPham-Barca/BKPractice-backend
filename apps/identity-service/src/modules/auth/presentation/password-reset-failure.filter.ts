import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

import { PasswordResetFailure } from '@/modules/auth/domain';

@Catch(PasswordResetFailure)
export class PasswordResetFailureFilter implements ExceptionFilter {
  catch(error: PasswordResetFailure, host: ArgumentsHost): void {
    const status =
      error.code === 'dependency_unavailable'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_REQUEST;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        statusCode: status,
        message:
          status === HttpStatus.BAD_REQUEST
            ? 'Invalid password reset request'
            : 'Password reset service unavailable',
      });
  }
}
