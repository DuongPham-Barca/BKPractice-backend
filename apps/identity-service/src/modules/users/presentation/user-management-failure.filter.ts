import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { UserManagementFailure } from '@/modules/users/domain';
import type { UserAdminRequest } from '@/modules/users/presentation/user-management.controller';

@Catch(UserManagementFailure)
export class UserManagementFailureFilter implements ExceptionFilter {
  private readonly logger = new Logger(UserManagementFailureFilter.name);

  catch(error: UserManagementFailure, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<UserAdminRequest>();
    const responses = {
      invalid: [400, 'Invalid user request'],
      not_found: [404, 'User unavailable'],
      forbidden: [403, 'Forbidden'],
    } as const;
    const [statusCode, message] = responses[error.code];
    const requestId = request.header('x-request-id');
    this.logger.warn({
      operation: request.method,
      outcome: error.code,
      actorId: request.principal?.userId,
      requestId: requestId && /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(requestId)
        ? requestId : undefined,
    });
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message });
  }
}
