import type { Principal } from '@learning/modules/courses/application/models/principal';
import {
  AddChapterUseCase,
  UpdateChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
} from '@learning/modules/courses/application/use-cases/chapter.use-cases';
import {
  PublishCourseUseCase,
  HoldCourseUseCase,
  RepublishCourseUseCase,
  SoftDeleteCourseUseCase,
  RestoreCourseUseCase,
  HardDeleteCourseUseCase,
} from '@learning/modules/courses/application/use-cases/course-lifecycle.use-cases';
import { CreateCourseUseCase } from '@learning/modules/courses/application/use-cases/create-course.use-case';
import {
  AddProblemToChapterUseCase,
  RemoveProblemFromChapterUseCase,
  ReorderProblemsInChapterUseCase,
} from '@learning/modules/courses/application/use-cases/problem-in-chapter.use-cases';
import {
  GetManagedCourseUseCase,
  ListManagedCoursesUseCase,
  GetPublishedCourseUseCase,
  ListPublishedCoursesUseCase,
  PreviewCourseUseCase,
} from '@learning/modules/courses/application/use-cases/read-course.use-cases';
import { UpdateCourseUseCase } from '@learning/modules/courses/application/use-cases/update-course.use-case';
import {
  CourseSlug,
  CourseTitle,
  CourseDescription,
  ChapterTitle,
  ChapterDescription,
  ChapterId,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';
import { CourseExceptionFilter } from '@learning/modules/courses/presentation/http/course-exception.filter';
import {
  AddChapterRequestDto,
  AddProblemRequestDto,
  CreateCourseRequestDto,
  IncludeDeletedQueryDto,
  ManagedCourseQueryDto,
  PublishedCourseQueryDto,
  ReorderRequestDto,
  UpdateChapterRequestDto,
  UpdateCourseRequestDto,
} from '@learning/modules/courses/presentation/http/dto/course.request.dto';
import {
  CourseListResponseDto,
  CourseResponseDto,
} from '@learning/modules/courses/presentation/http/dto/course.response.dto';
import {
  toCourseListResponse,
  toCourseResponse,
} from '@learning/modules/courses/presentation/http/mappers/course-response.mapper';
import { TrustedPrincipal } from '@learning/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('courses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or malformed trusted principal headers.' })
@ApiForbiddenResponse({ description: 'Missing role/permission or not the owner.' })
@ApiBadRequestResponse({ description: 'Validation or readiness failure.' })
@ApiConflictResponse({ description: 'Invalid state, duplicate or referenced.' })
@ApiNotFoundResponse({ description: 'Course or chapter not found.' })
@UseFilters(CourseExceptionFilter)
@Controller('api/courses')
export class ManagedCoursesController {
  constructor(
    private readonly createCourseUseCase: CreateCourseUseCase,
    private readonly updateCourseUseCase: UpdateCourseUseCase,
    private readonly publishCourseUseCase: PublishCourseUseCase,
    private readonly holdCourseUseCase: HoldCourseUseCase,
    private readonly republishCourseUseCase: RepublishCourseUseCase,
    private readonly softDeleteCourseUseCase: SoftDeleteCourseUseCase,
    private readonly restoreCourseUseCase: RestoreCourseUseCase,
    private readonly hardDeleteCourseUseCase: HardDeleteCourseUseCase,
    private readonly addChapterUseCase: AddChapterUseCase,
    private readonly updateChapterUseCase: UpdateChapterUseCase,
    private readonly removeChapterUseCase: RemoveChapterUseCase,
    private readonly reorderChaptersUseCase: ReorderChaptersUseCase,
    private readonly addProblemUseCase: AddProblemToChapterUseCase,
    private readonly removeProblemUseCase: RemoveProblemFromChapterUseCase,
    private readonly reorderProblemsUseCase: ReorderProblemsInChapterUseCase,
    private readonly getManagedCourseUseCase: GetManagedCourseUseCase,
    private readonly listManagedCoursesUseCase: ListManagedCoursesUseCase,
    private readonly getPublishedCourseUseCase: GetPublishedCourseUseCase,
    private readonly listPublishedCoursesUseCase: ListPublishedCoursesUseCase,
    private readonly previewCourseUseCase: PreviewCourseUseCase,
  ) {}

  @ApiOperation({ summary: 'Create a draft course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TrustedPrincipal() principal: Principal,
    @Body() body: CreateCourseRequestDto,
  ): Promise<CourseResponseDto> {
    const command = {
      slug: new CourseSlug(body.slug),
      title: new CourseTitle(body.title),
      description: new CourseDescription(body.description ?? null),
    };
    const course = await this.createCourseUseCase.execute(principal, command);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'List own courses' })
  @ApiOkResponse({ type: CourseListResponseDto })
  @Get('managed')
  async listManaged(
    @TrustedPrincipal() principal: Principal,
    @Query() q: ManagedCourseQueryDto,
  ): Promise<CourseListResponseDto> {
    return toCourseListResponse(
      await this.listManagedCoursesUseCase.execute(principal, q.includeDeleted, q.page, q.limit),
    );
  }

  @ApiOperation({ summary: 'Get own course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Get('managed/:id')
  async getManaged(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: IncludeDeletedQueryDto,
  ): Promise<CourseResponseDto> {
    const course = await this.getManagedCourseUseCase.execute(principal, id, q.includeDeleted);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Update course title/description' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Patch(':id')
  async update(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCourseRequestDto,
  ): Promise<CourseResponseDto> {
    const command = {
      title: body.title ? new CourseTitle(body.title) : undefined,
      description:
        body.description === undefined ? undefined : new CourseDescription(body.description),
    };
    const course = await this.updateCourseUseCase.execute(principal, id, command);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Publish a ready course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/publish')
  async publish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.publishCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Put a published course on hold' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/hold')
  async hold(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.holdCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Republish a held course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/republish')
  async republish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.republishCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Soft-delete a published/on-hold course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.softDeleteCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted course' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/restore')
  async restore(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.restoreCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Hard-delete an unreferenced draft course' })
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.hardDeleteCourseUseCase.execute(principal, id);
  }

  @ApiOperation({ summary: 'Preview a course as a learner would see it' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/preview')
  async preview(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseResponseDto> {
    const course = await this.previewCourseUseCase.execute(principal, id);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Add a chapter' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/chapters')
  async addChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddChapterRequestDto,
  ): Promise<CourseResponseDto> {
    const result = await this.addChapterUseCase.execute(
      principal,
      id,
      new ChapterTitle(body.title),
      new ChapterDescription(body.description ?? null),
    );
    return toCourseResponse(result.course);
  }

  @ApiOperation({ summary: 'Update a chapter' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Patch(':id/chapters/:chapterId')
  async updateChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: UpdateChapterRequestDto,
  ): Promise<CourseResponseDto> {
    const title = body.title ? new ChapterTitle(body.title) : undefined;
    const description =
      body.description === undefined ? undefined : new ChapterDescription(body.description);
    const course = await this.updateChapterUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      title,
      description,
    );
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Remove a chapter and its problem references' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Delete(':id/chapters/:chapterId')
  async removeChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
  ): Promise<CourseResponseDto> {
    const course = await this.removeChapterUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
    );
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Reorder chapters' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Put(':id/chapters/order')
  async reorderChapters(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReorderRequestDto,
  ): Promise<CourseResponseDto> {
    const ids = body.orderedIds.map((x) => ChapterId.from(x));
    const course = await this.reorderChaptersUseCase.execute(principal, id, ids);
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Attach a problem to a chapter' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Post(':id/chapters/:chapterId/problems')
  async addProblem(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: AddProblemRequestDto,
  ): Promise<CourseResponseDto> {
    const course = await this.addProblemUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      new ProblemReference(body.problemId),
    );
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Detach a problem from a chapter' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Delete(':id/chapters/:chapterId/problems/:problemId')
  async removeProblem(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ): Promise<CourseResponseDto> {
    const course = await this.removeProblemUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      new ProblemReference(problemId),
    );
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'Reorder problems in a chapter' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Put(':id/chapters/:chapterId/problems/order')
  async reorderProblems(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: ReorderRequestDto,
  ): Promise<CourseResponseDto> {
    const ids = body.orderedIds.map((x) => new ProblemReference(x));
    const course = await this.reorderProblemsUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      ids,
    );
    return toCourseResponse(course);
  }

  @ApiOperation({ summary: 'List published courses' })
  @ApiOkResponse({ type: CourseListResponseDto })
  @Get()
  async listPublished(@Query() q: PublishedCourseQueryDto): Promise<CourseListResponseDto> {
    return toCourseListResponse(
      await this.listPublishedCoursesUseCase.execute({
        page: q.page,
        limit: q.limit,
        search: q.search,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a published course by id or slug' })
  @ApiOkResponse({ type: CourseResponseDto })
  @Get(':idOrSlug')
  async getPublished(@Param('idOrSlug') idOrSlug: string): Promise<CourseResponseDto> {
    const course = await this.getPublishedCourseUseCase.execute(idOrSlug);
    return toCourseResponse(course);
  }
}
