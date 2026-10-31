import { Controller, Get, HttpCode, HttpStatus, Inject, Req, UseFilters } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';

import { BK_TOKEN_SERVICE, REFRESH_SESSION_REPOSITORY } from '@/modules/auth/application';
import type { BkTokenService, RefreshSessionRepository } from '@/modules/auth/application/ports';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthFailureFilter } from '@/modules/auth/presentation/auth-failure.filter';

@Controller('internal/auth/session')
@ApiExcludeController()
@UseFilters(AuthFailureFilter)
export class SessionStatusController {
  constructor(
    @Inject(BK_TOKEN_SERVICE) private readonly tokens: BkTokenService,
    @Inject(REFRESH_SESSION_REPOSITORY) private readonly sessions: RefreshSessionRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.NO_CONTENT)
  async check(@Req() request: Request): Promise<void> {
    const authorization = request.header('authorization');
    if (!authorization || !/^Bearer [^\s]+$/.test(authorization))
      throw new AuthFailure('invalid_token');
    const { sub, sid } = await this.tokens.verifyAccessClaims(authorization.slice(7));
    if (!(await this.sessions.isActive(sub, sid))) throw new AuthFailure('invalid_token');
  }
}
