import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { RbacFailure } from '@/modules/rbac/domain';

@Catch(RbacFailure)
export class RbacFailureFilter implements ExceptionFilter {
  private readonly logger = new Logger(RbacFailureFilter.name);

  catch(error: RbacFailure, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    this.logger.warn({
      operation: request.method,
      outcome: error.code,
      requestId: request.header('x-request-id'),
    });
    const failures = {
      forbidden: [403, 'Forbidden'],
      invalid_role: [400, 'Invalid role'],
      user_not_found: [404, 'User not found'],
      last_admin: [409, 'The last administrator cannot be removed'],
    } as const;
    const [status, message] = failures[error.code];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
