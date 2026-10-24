import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { GetPublicProblemUseCase } from '../../application/use-cases/get-public-problem.use-case';
import { ListPublicProblemsUseCase } from '../../application/use-cases/list-public-problems.use-case';

import { ProblemIdentifierParamDto, ProblemQueryDto } from './dto/problem-query.dto';
import { ProblemDetailResponseDto, ProblemListResponseDto } from './dto/problem-response.dto';
import { ProblemExceptionFilter } from './filters/problem-exception.filter';
import { ProblemResponseMapper } from './mappers/problem-response.mapper';

@ApiTags('problems')
@ApiBearerAuth()
@UseFilters(ProblemExceptionFilter)
@Controller('api/problems')
export class PublicProblemsController {
  constructor(
    private readonly getPublicProblem: GetPublicProblemUseCase,
    private readonly listPublicProblems: ListPublicProblemsUseCase,
    private readonly responseMapper: ProblemResponseMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List published problems',
    description:
      'Returns paginated list of published problems. Supports filtering by problemType, difficulty, topicId, tagId, and full-text search. Only PUBLISHED and non-deleted problems are returned.',
  })
  @ApiOkResponse({
    type: ProblemListResponseDto,
    description: 'Paginated list of published problems',
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async list(@Query() query: ProblemQueryDto): Promise<ProblemListResponseDto> {
    const page = await this.listPublicProblems.execute(query, query.page, query.limit);
    return this.responseMapper.toPublicPage(page);
  }

  @Get(':idOrSlug')
  @ApiOperation({
    summary: 'Get a published problem by id or slug',
    description:
      'Returns detailed problem information. Only PUBLISHED and non-deleted problems are accessible. Returns 404 for DRAFT, ON_HOLD, deleted, or non-existent problems.',
  })
  @ApiOkResponse({ type: ProblemDetailResponseDto, description: 'Published problem details' })
  @ApiBadRequestResponse({ description: 'Invalid idOrSlug format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiNotFoundResponse({ description: 'Problem not found or not published' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async detail(@Param() params: ProblemIdentifierParamDto): Promise<ProblemDetailResponseDto> {
    const result = await this.getPublicProblem.execute(params.idOrSlug);
    return this.responseMapper.toPublicDetail(result);
  }
}
