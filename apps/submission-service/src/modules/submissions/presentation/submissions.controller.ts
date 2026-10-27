import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GetSubmissionDetailUseCase } from '../application/get-submission-detail.use-case';
import { ListSubmissionHistoryUseCase } from '../application/list-submission-history.use-case';
import { SubmitCodeUseCase } from '../application/submit-code.use-case';
import {
  JudgePackageUnavailableError,
  ProblemNotSubmittableError,
} from '../domain/ports/learning-judge-package.port';

import { ListSubmissionHistoryQueryDto } from './dto/list-submission-history.query.dto';
import { SubmissionDetailDto } from './dto/submission-detail.dto';
import { SubmissionHistoryPageDto } from './dto/submission-history-page.dto';
import { SubmitCodeRequestDto } from './dto/submit-code-request.dto';
import { SubmitCodeResponseDto } from './dto/submit-code-response.dto';
import { requireTrustedOwner } from './trusted-owner';

@ApiTags('submissions')
@Controller('api')
export class SubmissionsController {
  constructor(
    private readonly listSubmissionHistory: ListSubmissionHistoryUseCase,
    private readonly getSubmissionDetail: GetSubmissionDetailUseCase,
    private readonly submitCode: SubmitCodeUseCase,
  ) {}

  @Post('submissions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ type: SubmitCodeResponseDto })
  async submit(
    @Headers('x-auth-user-id') userId: string | undefined,
    @Body() dto: SubmitCodeRequestDto,
  ): Promise<SubmitCodeResponseDto> {
    const ownerId = requireTrustedOwner(userId);
    try {
      const result = await this.submitCode.execute({ userId: ownerId, ...dto });
      return { ...result, createdAt: result.createdAt.toISOString() };
    } catch (error: unknown) {
      if (error instanceof ProblemNotSubmittableError) throw new NotFoundException(error.message);
      if (error instanceof JudgePackageUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }

  @Get('submissions')
  @ApiOkResponse({ type: SubmissionHistoryPageDto })
  async list(
    @Headers('x-auth-user-id') userId: string | undefined,
    @Query() query: ListSubmissionHistoryQueryDto,
  ): Promise<SubmissionHistoryPageDto> {
    const page = await this.listSubmissionHistory.execute({
      ownerId: requireTrustedOwner(userId),
      filter: { kind: query.kind, problemId: query.problemId },
      cursor:
        query.cursor && query.cursorId
          ? { createdAt: query.cursor, publicId: query.cursorId }
          : null,
      limit: query.limit,
    });
    return { ...page, items: [...page.items] };
  }

  @Get('submissions/:publicId')
  @ApiOkResponse({ type: SubmissionDetailDto })
  async get(
    @Headers('x-auth-user-id') userId: string | undefined,
    @Param('publicId', new ParseUUIDPipe({ version: '4' })) publicId: string,
  ): Promise<SubmissionDetailDto> {
    const detail = await this.getSubmissionDetail.execute({
      ownerId: requireTrustedOwner(userId),
      publicIdOrLegacyId: publicId,
    });
    if (!detail) throw new NotFoundException('Submission not found');
    return detail;
  }
}
