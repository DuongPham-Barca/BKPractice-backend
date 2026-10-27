import {
  Body,
  Controller,
  Get,
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

import { TrustedOwner } from './decorators/trusted-owner.decorator';
import { ListSubmissionHistoryQueryDto } from './dto/list-submission-history.query.dto';
import { SubmissionDetailDto } from './dto/submission-detail.dto';
import { SubmissionHistoryPageDto } from './dto/submission-history-page.dto';
import { SubmitCodeRequestDto } from './dto/submit-code-request.dto';
import { SubmitCodeResponseDto } from './dto/submit-code-response.dto';

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
    @TrustedOwner() ownerId: string,
    @Body() dto: SubmitCodeRequestDto,
  ): Promise<SubmitCodeResponseDto> {
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
    @TrustedOwner() ownerId: string,
    @Query() query: ListSubmissionHistoryQueryDto,
  ): Promise<SubmissionHistoryPageDto> {
    const page = await this.listSubmissionHistory.execute({
      ownerId,
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
    @TrustedOwner() ownerId: string,
    @Param('publicId', new ParseUUIDPipe({ version: '4' })) publicId: string,
  ): Promise<SubmissionDetailDto> {
    const detail = await this.getSubmissionDetail.execute({
      ownerId,
      publicIdOrLegacyId: publicId,
    });
    if (!detail) throw new NotFoundException('Submission not found');
    return detail;
  }
}
