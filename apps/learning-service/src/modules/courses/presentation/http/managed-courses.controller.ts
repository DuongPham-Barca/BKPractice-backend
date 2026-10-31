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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('courses')
@ApiBearerAuth()
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TrustedPrincipal() principal: Principal,
    @Body() body: { slug: string; title: string; description?: string | null },
  ): Promise<unknown> {
    const command = {
      slug: new CourseSlug(body.slug),
      title: new CourseTitle(body.title),
      description: new CourseDescription(body.description ?? null),
    };
    const course = await this.createCourseUseCase.execute(principal, command);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Get('managed')
  async listManaged(
    @TrustedPrincipal() principal: Principal,
    @Query() q: { includeDeleted?: string; page?: string; limit?: string },
  ): Promise<unknown> {
    const includeDeleted = q.includeDeleted === 'true';
    const page = q.page ? Number(q.page) : 1;
    const limit = q.limit ? Number(q.limit) : 20;
    return this.listManagedCoursesUseCase.execute(principal, includeDeleted, page, limit);
  }

  @Get('managed/:id')
  async getManaged(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: { includeDeleted?: string },
  ): Promise<unknown> {
    const includeDeleted = q.includeDeleted === 'true';
    const course = await this.getManagedCourseUseCase.execute(principal, id, includeDeleted);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Patch(':id')
  async update(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; description?: string | null },
  ): Promise<unknown> {
    const command = {
      title: body.title ? new CourseTitle(body.title) : undefined,
      description:
        body.description === undefined ? undefined : new CourseDescription(body.description),
    };
    const course = await this.updateCourseUseCase.execute(principal, id, command);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Post(':id/publish')
  async publish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.publishCourseUseCase.execute(principal, id, []);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Post(':id/hold')
  async hold(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.holdCourseUseCase.execute(principal, id);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Post(':id/republish')
  async republish(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.republishCourseUseCase.execute(principal, id, []);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.softDeleteCourseUseCase.execute(principal, id);
    return course ? (course as { toSnapshot: () => unknown }).toSnapshot() : null;
  }

  @Post(':id/restore')
  async restore(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.restoreCourseUseCase.execute(principal, id);
    return course ? (course as { toSnapshot: () => unknown }).toSnapshot() : null;
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.hardDeleteCourseUseCase.execute(principal, id);
  }

  @Post(':id/preview')
  async preview(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const course = await this.previewCourseUseCase.execute(principal, id);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Post(':id/chapters')
  async addChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title: string; description?: string | null },
  ): Promise<unknown> {
    const result = await this.addChapterUseCase.execute(
      principal,
      id,
      new ChapterTitle(body.title),
      new ChapterDescription(body.description ?? null),
    );
    return (result as { course: { toSnapshot: () => unknown } }).course.toSnapshot();
  }

  @Patch(':id/chapters/:chapterId')
  async updateChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: { title?: string; description?: string | null },
  ): Promise<unknown> {
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
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Delete(':id/chapters/:chapterId')
  async removeChapter(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
  ): Promise<unknown> {
    const course = await this.removeChapterUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
    );
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Put(':id/chapters/order')
  async reorderChapters(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { orderedIds: string[] },
  ): Promise<unknown> {
    const ids = body.orderedIds.map((x) => ChapterId.from(x));
    const course = await this.reorderChaptersUseCase.execute(principal, id, ids);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Post(':id/chapters/:chapterId/problems')
  async addProblem(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: { problemId: string },
  ): Promise<unknown> {
    const course = await this.addProblemUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      new ProblemReference(body.problemId),
    );
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Delete(':id/chapters/:chapterId/problems/:problemId')
  async removeProblem(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ): Promise<unknown> {
    const course = await this.removeProblemUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      new ProblemReference(problemId),
    );
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Put(':id/chapters/:chapterId/problems/order')
  async reorderProblems(
    @TrustedPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() body: { orderedIds: string[] },
  ): Promise<unknown> {
    const ids = body.orderedIds.map((x) => new ProblemReference(x));
    const course = await this.reorderProblemsUseCase.execute(
      principal,
      id,
      ChapterId.from(chapterId),
      ids,
    );
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }

  @Get()
  async listPublished(
    @Query() q: { page?: string; limit?: string; search?: string },
  ): Promise<unknown> {
    const page = q.page ? Number(q.page) : 1;
    const limit = q.limit ? Number(q.limit) : 20;
    return this.listPublishedCoursesUseCase.execute({ page, limit, search: q.search });
  }

  @Get(':idOrSlug')
  async getPublished(@Param('idOrSlug') idOrSlug: string): Promise<unknown> {
    const course = await this.getPublishedCourseUseCase.execute(idOrSlug);
    return (course as { toSnapshot: () => unknown }).toSnapshot();
  }
}
