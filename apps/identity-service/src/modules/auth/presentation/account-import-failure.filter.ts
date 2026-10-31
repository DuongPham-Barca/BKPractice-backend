import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

import { AccountImportFailure } from '@/modules/auth/domain';

@Catch(AccountImportFailure)
export class AccountImportFailureFilter implements ExceptionFilter {
  catch(error: AccountImportFailure, host: ArgumentsHost): void {
    const status =
      error.code === 'forbidden'
        ? 403
        : error.code === 'dependency_unavailable'
          ? 503
          : error.code === 'conflict'
            ? 409
            : 400;
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      code: error.code,
      totalRows: error.totalRows,
      created: 0,
      issues: error.issues,
    });
  }
}
