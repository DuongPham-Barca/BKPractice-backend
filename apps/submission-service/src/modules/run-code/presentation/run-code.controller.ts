import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiAcceptedResponse, ApiTags } from '@nestjs/swagger';
import { TrustedOwner } from '@submission/modules/submissions/presentation/decorators/trusted-owner.decorator';

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
  async run(@TrustedOwner() ownerId: string, @Body() dto: RunCodeDto): Promise<RunCodeResponseDto> {
    const result = await this.runCode.execute({ userId: ownerId, ...dto });
    return { ...result, createdAt: result.createdAt.toISOString() };
  }
}
