import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiTags } from '@nestjs/swagger';

import { requireTrustedOwner } from '../../submissions/presentation/trusted-owner';
import { RunCodeUseCase } from '../application/run-code.use-case';

import { RunCodeResponseDto } from './dto/run-code-response.dto';
import { RunCodeDto } from './dto/run-code.dto';

@ApiTags('submissions')
@Controller('api')
export class RunCodeController {
  constructor(private readonly runCode: RunCodeUseCase) {}

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: RunCodeResponseDto })
  async run(
    @Headers('x-auth-user-id') userId: string | undefined,
    @Body() dto: RunCodeDto,
  ): Promise<RunCodeResponseDto> {
    const result = await this.runCode.execute({
      userId: requireTrustedOwner(userId),
      ...dto,
    });
    return { ...result, createdAt: result.createdAt.toISOString() };
  }
}
