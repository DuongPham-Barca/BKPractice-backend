import { Injectable, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';

@Injectable()
export class RbacInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RbacInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      tap(() =>
        this.logger.log({
          operation: request.method,
          outcome: 'success',
          requestId: request.header('x-request-id'),
        }),
      ),
    );
  }
}
