import { TrustedPrincipal } from '@learning/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import { TrustedPrincipalGuard } from '@learning/modules/problems/presentation/http/guards/trusted-principal.guard';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { Principal } from '@/modules/courses/application/models';
import {
  ADD_CHAPTER_PORT_IN,
  ATTACH_PROBLEM_PORT_IN,
  DETACH_PROBLEM_PORT_IN,
  REMOVE_CHAPTER_PORT_IN,
  REORDER_CHAPTER_PROBLEMS_PORT_IN,
  REORDER_CHAPTERS_PORT_IN,
  UPDATE_CHAPTER_PORT_IN,
} from '@/modules/courses/application/ports/in';
import type {
  IAddChapterPortIn,
  IAttachProblemPortIn,
  IDetachProblemPortIn,
  IRemoveChapterPortIn,
  IReorderChapterProblemsPortIn,
  IReorderChaptersPortIn,
  IUpdateChapterPortIn,
} from '@/modules/courses/application/ports/in';
import {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
  ProblemReference,
} from '@/modules/courses/domain/value-objects';
import {
  AddChapterRequestDto,
  AttachProblemRequestDto,
  ReorderRequestDto,
  UpdateChapterRequestDto,
  ManagedCourseResponseDto,
} from '@/modules/courses/presentation/http/dto';
import { CourseExceptionFilter } from '@/modules/courses/presentation/http/filters';
import { toManagedCourseResponse } from '@/modules/courses/presentation/http/mappers';

@ApiTags('courses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or malformed trusted principal headers.' })
@ApiForbiddenResponse({ description: 'Missing ADMIN role or required course permission.' })
@ApiBadRequestResponse({ description: 'Validation, limit or readiness failure.' })
@ApiConflictResponse({ description: 'Invalid state or duplicate slug/problem.' })
@ApiNotFoundResponse({ description: 'Course or chapter not found.' })
@UseGuards(TrustedPrincipalGuard)
@UseFilters(CourseExceptionFilter)
@Controller('api/courses')
export class ManagedChaptersController {
  constructor(
    @Inject(ADD_CHAPTER_PORT_IN) private readonly addChapter: IAddChapterPortIn,
    @Inject(UPDATE_CHAPTER_PORT_IN) private readonly updateChapter: IUpdateChapterPortIn,
    @Inject(REMOVE_CHAPTER_PORT_IN) private readonly removeChapter: IRemoveChapterPortIn,
    @Inject(REORDER_CHAPTERS_PORT_IN) private readonly reorderChapters: IReorderChaptersPortIn,
    @Inject(ATTACH_PROBLEM_PORT_IN) private readonly attachProblem: IAttachProblemPortIn,
    @Inject(DETACH_PROBLEM_PORT_IN) private readonly detachProblem: IDetachProblemPortIn,
    @Inject(REORDER_CHAPTER_PROBLEMS_PORT_IN)
    private readonly reorderProblems: IReorderChapterProblemsPortIn,
  ) {}
  @ApiOperation({ summary: 'Add a chapter (at the end or at `position`)' })
  @ApiCreatedResponse({ type: ManagedCourseResponseDto })
  @Post(':id/chapters')
  async addChapterToCourse(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddChapterRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.addChapter.execute(
        principal,
        id,
        new ChapterTitle(body.title),
        new ChapterDescription(body.description ?? null),
        body.position,
      ),
    );
  }

  @ApiOperation({ summary: 'Reorder chapters (must list exactly the current set)' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @Put(':id/chapters/order')
  async reorderCourseChapters(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReorderRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.reorderChapters.execute(
        principal,
        id,
        body.ids.map((value) => ChapterId.from(value)),
      ),
    );
  }

  @ApiOperation({ summary: 'Update a chapter' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @Patch(':id/chapters/:chapterId')
  async updateCourseChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: UpdateChapterRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.updateChapter.execute(
        principal,
        id,
        ChapterId.from(chapterId),
        body.title === undefined ? undefined : new ChapterTitle(body.title),
        body.description === undefined ? undefined : new ChapterDescription(body.description),
      ),
    );
  }

  @ApiOperation({ summary: 'Remove a chapter and its problem references' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/chapters/:chapterId')
  async removeCourseChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
  ): Promise<void> {
    await this.removeChapter.execute(principal, id, ChapterId.from(chapterId));
  }

  @ApiOperation({ summary: 'Attach a problem to a chapter' })
  @ApiCreatedResponse({ type: ManagedCourseResponseDto })
  @Post(':id/chapters/:chapterId/problems')
  async attach(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: AttachProblemRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.attachProblem.execute(
        principal,
        id,
        ChapterId.from(chapterId),
        new ProblemReference(body.problemId),
        body.position,
      ),
    );
  }

  @ApiOperation({ summary: 'Reorder problems in a chapter (must list exactly the current set)' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @Put(':id/chapters/:chapterId/problems/order')
  async reorderChapterProblems(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: ReorderRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.reorderProblems.execute(
        principal,
        id,
        ChapterId.from(chapterId),
        body.ids.map((value) => new ProblemReference(value)),
      ),
    );
  }

  @ApiOperation({ summary: 'Detach a problem from a chapter' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/chapters/:chapterId/problems/:problemId')
  async detach(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ): Promise<void> {
    await this.detachProblem.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      new ProblemReference(problemId),
    );
  }
}
