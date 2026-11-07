import type { Principal } from '@learning/modules/courses/application/models/principal';
import {
  ADD_CHAPTER_PORT_IN,
  ATTACH_PROBLEM_PORT_IN,
  CREATE_COURSE_PORT_IN,
  DELETE_COURSE_PORT_IN,
  DETACH_PROBLEM_PORT_IN,
  GET_MANAGED_COURSE_PORT_IN,
  GET_PUBLISHED_COURSE_PORT_IN,
  HOLD_COURSE_PORT_IN,
  LIST_MANAGED_COURSES_PORT_IN,
  LIST_PUBLISHED_COURSES_PORT_IN,
  PUBLISH_COURSE_PORT_IN,
  REMOVE_CHAPTER_PORT_IN,
  REORDER_CHAPTER_PROBLEMS_PORT_IN,
  REORDER_CHAPTERS_PORT_IN,
  REPUBLISH_COURSE_PORT_IN,
  RESTORE_COURSE_PORT_IN,
  UPDATE_CHAPTER_PORT_IN,
  UPDATE_COURSE_PORT_IN,
} from '@learning/modules/courses/application/ports/in/course-use-cases.port.in';
import type {
  IAddChapterPortIn,
  IAttachProblemPortIn,
  ICreateCoursePortIn,
  IDeleteCoursePortIn,
  IDetachProblemPortIn,
  IGetManagedCoursePortIn,
  IGetPublishedCoursePortIn,
  IHoldCoursePortIn,
  IListManagedCoursesPortIn,
  IListPublishedCoursesPortIn,
  IPublishCoursePortIn,
  IRemoveChapterPortIn,
  IReorderChapterProblemsPortIn,
  IReorderChaptersPortIn,
  IRepublishCoursePortIn,
  IRestoreCoursePortIn,
  IUpdateChapterPortIn,
  IUpdateCoursePortIn,
} from '@learning/modules/courses/application/ports/in/course-use-cases.port.in';
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
  Inject,
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
@ApiForbiddenResponse({ description: 'Missing ADMIN role or required course permission.' })
@ApiBadRequestResponse({ description: 'Validation, limit or readiness failure.' })
@ApiConflictResponse({ description: 'Invalid state or duplicate slug/problem.' })
@ApiNotFoundResponse({ description: 'Course or chapter not found.' })
@UseGuards(TrustedPrincipalGuard)
@UseFilters(CourseExceptionFilter)
@Controller('api/courses')
export class ManagedCoursesController {
  constructor(
    @Inject(CREATE_COURSE_PORT_IN) private readonly createCourse: ICreateCoursePortIn,
    @Inject(UPDATE_COURSE_PORT_IN) private readonly updateCourse: IUpdateCoursePortIn,
    @Inject(PUBLISH_COURSE_PORT_IN) private readonly publishCourse: IPublishCoursePortIn,
    @Inject(HOLD_COURSE_PORT_IN) private readonly holdCourse: IHoldCoursePortIn,
    @Inject(REPUBLISH_COURSE_PORT_IN) private readonly republishCourse: IRepublishCoursePortIn,
    @Inject(DELETE_COURSE_PORT_IN) private readonly deleteCourse: IDeleteCoursePortIn,
    @Inject(RESTORE_COURSE_PORT_IN) private readonly restoreCourse: IRestoreCoursePortIn,
    @Inject(ADD_CHAPTER_PORT_IN) private readonly addChapter: IAddChapterPortIn,
    @Inject(UPDATE_CHAPTER_PORT_IN) private readonly updateChapter: IUpdateChapterPortIn,
    @Inject(REMOVE_CHAPTER_PORT_IN) private readonly removeChapter: IRemoveChapterPortIn,
    @Inject(REORDER_CHAPTERS_PORT_IN) private readonly reorderChapters: IReorderChaptersPortIn,
    @Inject(ATTACH_PROBLEM_PORT_IN) private readonly attachProblem: IAttachProblemPortIn,
    @Inject(DETACH_PROBLEM_PORT_IN) private readonly detachProblem: IDetachProblemPortIn,
    @Inject(REORDER_CHAPTER_PROBLEMS_PORT_IN)
    private readonly reorderProblems: IReorderChapterProblemsPortIn,
    @Inject(GET_MANAGED_COURSE_PORT_IN) private readonly getManagedCourse: IGetManagedCoursePortIn,
    @Inject(LIST_MANAGED_COURSES_PORT_IN)
    private readonly listManagedCourses: IListManagedCoursesPortIn,
    @Inject(GET_PUBLISHED_COURSE_PORT_IN)
    private readonly getPublishedCourse: IGetPublishedCoursePortIn,
    @Inject(LIST_PUBLISHED_COURSES_PORT_IN)
    private readonly listPublishedCourses: IListPublishedCoursesPortIn,
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

  @ApiOperation({ summary: 'List courses managed by ADMIN in any state' })
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

  @ApiOperation({ summary: 'Get a managed course with problem states and readiness' })
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
    summary: 'Delete a course: hard-delete a draft, soft-delete otherwise',
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
