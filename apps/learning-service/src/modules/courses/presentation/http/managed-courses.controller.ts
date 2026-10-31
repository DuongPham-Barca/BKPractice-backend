import type { Principal } from '@learning/modules/courses/application/models/principal';
import {
  AddChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
  UpdateChapterUseCase,
} from '@learning/modules/courses/application/use-cases/chapter.use-cases';
import {
  DeleteCourseUseCase,
  HoldCourseUseCase,
  PublishCourseUseCase,
  RepublishCourseUseCase,
  RestoreCourseUseCase,
} from '@learning/modules/courses/application/use-cases/course-lifecycle.use-cases';
import { CreateCourseUseCase } from '@learning/modules/courses/application/use-cases/create-course.use-case';
import {
  AttachProblemUseCase,
  DetachProblemUseCase,
  ReorderChapterProblemsUseCase,
} from '@learning/modules/courses/application/use-cases/problem-in-chapter.use-cases';
import {
  GetManagedCourseUseCase,
  GetPublishedCourseUseCase,
  ListManagedCoursesUseCase,
  ListPublishedCoursesUseCase,
} from '@learning/modules/courses/application/use-cases/read-course.use-cases';
import { UpdateCourseUseCase } from '@learning/modules/courses/application/use-cases/update-course.use-case';
import {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
  CourseDescription,
  CourseSlug,
  CourseTitle,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';
import { CourseExceptionFilter } from '@learning/modules/courses/presentation/http/course-exception.filter';
import {
  AddChapterRequestDto,
  AttachProblemRequestDto,
  CreateCourseRequestDto,
  IncludeDeletedQueryDto,
  ManagedCourseQueryDto,
  PublishedCourseQueryDto,
  ReorderRequestDto,
  UpdateChapterRequestDto,
  UpdateCourseRequestDto,
} from '@learning/modules/courses/presentation/http/dto/course.request.dto';
import {
  CourseDetailResponseDto,
  CourseListResponseDto,
  ManagedCourseListResponseDto,
  ManagedCourseResponseDto,
} from '@learning/modules/courses/presentation/http/dto/course.response.dto';
import {
  toCourseDetailResponse,
  toCourseListResponse,
  toManagedCourseListResponse,
  toManagedCourseResponse,
} from '@learning/modules/courses/presentation/http/mappers/course-response.mapper';
import { TrustedPrincipal } from '@learning/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import { TrustedPrincipalGuard } from '@learning/modules/problems/presentation/http/guards/trusted-principal.guard';
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

/**
 * 18 route theo bảng API của plan LRN-003. Route `managed` khai báo trước `:idOrSlug`. Mỗi route gọi
 * đúng một use case; không có logic nghiệp vụ ở đây.
 */
@ApiTags('courses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or malformed trusted principal headers.' })
@ApiForbiddenResponse({ description: 'Missing role/permission or not the owner.' })
@ApiBadRequestResponse({ description: 'Validation, limit or readiness failure.' })
@ApiConflictResponse({ description: 'Invalid state, duplicate slug/problem or referenced.' })
@ApiNotFoundResponse({ description: 'Course or chapter not found.' })
@UseGuards(TrustedPrincipalGuard)
@UseFilters(CourseExceptionFilter)
@Controller('api/courses')
export class ManagedCoursesController {
  constructor(
    private readonly createCourse: CreateCourseUseCase,
    private readonly updateCourse: UpdateCourseUseCase,
    private readonly publishCourse: PublishCourseUseCase,
    private readonly holdCourse: HoldCourseUseCase,
    private readonly republishCourse: RepublishCourseUseCase,
    private readonly deleteCourse: DeleteCourseUseCase,
    private readonly restoreCourse: RestoreCourseUseCase,
    private readonly addChapter: AddChapterUseCase,
    private readonly updateChapter: UpdateChapterUseCase,
    private readonly removeChapter: RemoveChapterUseCase,
    private readonly reorderChapters: ReorderChaptersUseCase,
    private readonly attachProblem: AttachProblemUseCase,
    private readonly detachProblem: DetachProblemUseCase,
    private readonly reorderProblems: ReorderChapterProblemsUseCase,
    private readonly getManagedCourse: GetManagedCourseUseCase,
    private readonly listManagedCourses: ListManagedCoursesUseCase,
    private readonly getPublishedCourse: GetPublishedCourseUseCase,
    private readonly listPublishedCourses: ListPublishedCoursesUseCase,
  ) {}

  @ApiOperation({ summary: 'List published courses' })
  @ApiOkResponse({ type: CourseListResponseDto })
  @Get()
  async listPublished(@Query() query: PublishedCourseQueryDto): Promise<CourseListResponseDto> {
    return toCourseListResponse(
      await this.listPublishedCourses.execute({
        page: query.page,
        limit: query.pageSize,
        search: query.q,
      }),
    );
  }

  @ApiOperation({ summary: 'List own courses in any state' })
  @ApiOkResponse({ type: ManagedCourseListResponseDto })
  @Get('managed')
  async listManaged(
    @TrustedPrincipal() principal: Principal,
    @Query() query: ManagedCourseQueryDto,
  ): Promise<ManagedCourseListResponseDto> {
    return toManagedCourseListResponse(
      await this.listManagedCourses.execute(
        principal,
        query.includeDeleted,
        query.page,
        query.pageSize,
        query.q,
      ),
    );
  }

  @ApiOperation({ summary: 'Get own course with problem states and readiness' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @Get('managed/:id')
  async getManaged(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: IncludeDeletedQueryDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.getManagedCourse.execute(principal, id, query.includeDeleted),
    );
  }

  @ApiOperation({ summary: 'Get a published course by id or slug (visible problems only)' })
  @ApiOkResponse({ type: CourseDetailResponseDto })
  @Get(':idOrSlug')
  async getPublished(@Param('idOrSlug') idOrSlug: string): Promise<CourseDetailResponseDto> {
    return toCourseDetailResponse(await this.getPublishedCourse.execute(idOrSlug));
  }

  @ApiOperation({ summary: 'Create a draft course' })
  @ApiCreatedResponse({ type: ManagedCourseResponseDto })
  @Post()
  async create(
    @TrustedPrincipal() principal: Principal,
    @Body() body: CreateCourseRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.createCourse.execute(principal, {
        slug: new CourseSlug(body.slug),
        title: new CourseTitle(body.title),
        description: new CourseDescription(body.description ?? null),
      }),
    );
  }

  @ApiOperation({ summary: 'Update course title/description' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @Patch(':id')
  async update(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCourseRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.updateCourse.execute(principal, id, {
        title: body.title === undefined ? undefined : new CourseTitle(body.title),
        description:
          body.description === undefined ? undefined : new CourseDescription(body.description),
      }),
    );
  }

  @ApiOperation({ summary: 'Publish a ready course' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/publish')
  async publish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(await this.publishCourse.execute(principal, id));
  }

  @ApiOperation({ summary: 'Put a published course on hold' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/hold')
  async hold(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(await this.holdCourse.execute(principal, id));
  }

  @ApiOperation({ summary: 'Republish a held course (readiness is re-checked)' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/republish')
  async republish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(await this.republishCourse.execute(principal, id));
  }

  @ApiOperation({
    summary: 'Delete a course: hard-delete an unreferenced draft, soft-delete otherwise',
  })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteCourse.execute(principal, id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted course to its previous status' })
  @ApiOkResponse({ type: ManagedCourseResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/restore')
  async restore(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(await this.restoreCourse.execute(principal, id));
  }

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
