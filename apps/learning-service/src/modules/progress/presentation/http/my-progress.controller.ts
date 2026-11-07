import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { TrustedPrincipal } from '@/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import { TrustedPrincipalGuard } from '@/modules/problems/presentation/http/guards/trusted-principal.guard';
import type { Principal } from '@/modules/progress/application/models';
import {
  GET_MY_SOLVED_STATUS_PORT_IN,
  GET_MY_COURSE_PROGRESS_PORT_IN,
  LIST_MY_SOLVED_PROBLEMS_PORT_IN,
} from '@/modules/progress/application/ports/in';
import type {
  IGetMySolvedStatusPortIn,
  IGetMyCourseProgressPortIn,
  IListMySolvedProblemsPortIn,
} from '@/modules/progress/application/ports/in';
import {
  CourseProgressResponseDto,
  NoProgressQueryDto,
  PageQueryDto,
  SolvedProblemPageResponseDto,
  SolvedStatusQueryDto,
  SolvedStatusResponseDto,
} from '@/modules/progress/presentation/http/dto';
import { ProgressExceptionFilter } from '@/modules/progress/presentation/http/filters';
import {
  toCourseProgressResponse,
  toSolvedProblemPageResponse,
  toSolvedStatusResponse,
} from '@/modules/progress/presentation/http/mappers';

@ApiTags('progress')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or malformed trusted principal.' })
@ApiBadRequestResponse({
  description: 'Invalid UUID, pagination, Problem list or unknown query field.',
})
@ApiInternalServerErrorResponse({ description: 'Unable to read personal progress.' })
@UseGuards(TrustedPrincipalGuard)
@UseFilters(ProgressExceptionFilter)
@Controller('api/progress/me')
export class MyProgressController {
  constructor(
    @Inject(LIST_MY_SOLVED_PROBLEMS_PORT_IN)
    private readonly listSolved: IListMySolvedProblemsPortIn,
    @Inject(GET_MY_SOLVED_STATUS_PORT_IN) private readonly getStatus: IGetMySolvedStatusPortIn,
    @Inject(GET_MY_COURSE_PROGRESS_PORT_IN) private readonly getCourse: IGetMyCourseProgressPortIn,
  ) {}
  @ApiOperation({
    summary: 'Get my solved status in input order; hidden and unknown Problems appear unsolved',
  })
  @ApiOkResponse({ type: [SolvedStatusResponseDto] })
  @Get('problems/status')
  async getSolvedStatus(
    @TrustedPrincipal() principal: Principal,
    @Query() query: SolvedStatusQueryDto,
  ): Promise<SolvedStatusResponseDto[]> {
    return toSolvedStatusResponse(await this.getStatus.execute(principal, query.problemIds));
  }
  @ApiOperation({
    summary:
      'List my solved, currently published Problems ordered by solve time descending, then Problem id ascending',
  })
  @ApiOkResponse({ type: SolvedProblemPageResponseDto })
  @Get('problems')
  async listSolvedProblems(
    @TrustedPrincipal() principal: Principal,
    @Query() query: PageQueryDto,
  ): Promise<SolvedProblemPageResponseDto> {
    return toSolvedProblemPageResponse(
      await this.listSolved.execute(principal, query.page, query.limit),
    );
  }
  @ApiOperation({
    summary: 'Get my progress on a published Course using its current visible structure',
  })
  @ApiOkResponse({ type: CourseProgressResponseDto })
  @ApiNotFoundResponse({ description: 'Course does not exist or is not published.' })
  @Get('courses/:courseId')
  async getCourseProgress(
    @TrustedPrincipal() principal: Principal,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() _query: NoProgressQueryDto,
  ): Promise<CourseProgressResponseDto> {
    return toCourseProgressResponse(await this.getCourse.execute(principal, courseId));
  }
}
