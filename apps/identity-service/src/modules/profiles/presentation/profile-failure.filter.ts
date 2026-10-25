import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ProfileFailure } from '@/modules/profiles/domain';
import { RbacFailure } from '@/modules/rbac/domain';

@Catch(ProfileFailure, RbacFailure)
export class ProfileFailureFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProfileFailureFilter.name);

  catch(error: ProfileFailure | RbacFailure, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const responses = {
      invalid: [400, 'Invalid profile request'],
      missing_name: [409, 'Official name is unavailable'],
      not_found: [404, 'Profile unavailable'],
      forbidden: [403, 'Forbidden'],
      dependency: [503, 'Profile dependency unavailable'],
    } as const;
    const code = error instanceof RbacFailure ? 'forbidden' : error.code;
    const [statusCode, message] = responses[code];
    const requestId = request.header('x-request-id');
    this.logger.warn({
      operation: request.method,
      outcome: code,
      requestId:
        requestId && /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(requestId)
          ? requestId
          : undefined,
    });
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message });
  }
}
