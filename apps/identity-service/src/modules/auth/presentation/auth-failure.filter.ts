import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

import { AuthFailure } from '@/modules/auth/domain';

@Catch(AuthFailure)
export class AuthFailureFilter implements ExceptionFilter {
  catch(error: AuthFailure, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error.code === 'dependency_unavailable'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.UNAUTHORIZED;
    response.status(status).json({
      statusCode: status,
      message:
        status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'Authentication service unavailable'
          : 'Authentication failed',
    });
  }
}
