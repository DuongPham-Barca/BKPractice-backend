import { timingSafeEqual } from 'node:crypto';

import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';

import { UserManagementUseCases } from '@/modules/users/application';

@ApiExcludeController()
@Controller('internal/users')
export class QuizShareRecipientController {
  constructor(
    private readonly users: UserManagementUseCases,
    private readonly config: ConfigService,
  ) {}
  @Get(':id/roles')
  async getRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-internal-service-secret') provided?: string,
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_SECRET');
    if (!expected) throw new ServiceUnavailableException('Internal lookup unavailable');
    const actual = Buffer.from(provided ?? '');
    const secret = Buffer.from(expected);
    if (actual.length !== secret.length || !timingSafeEqual(actual, secret))
      throw new UnauthorizedException('Invalid internal credential');
    const user = await this.users.getQuizShareRecipient(id.toLowerCase());
    if (!user) throw new NotFoundException();
    return user;
  }
}
