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

import type { Principal } from '@/modules/courses/application/models';
import {
  CREATE_COURSE_PORT_IN,
  DELETE_COURSE_PORT_IN,
  GET_MANAGED_COURSE_PORT_IN,
  HOLD_COURSE_PORT_IN,
  LIST_MANAGED_COURSES_PORT_IN,
  PUBLISH_COURSE_PORT_IN,
  REPUBLISH_COURSE_PORT_IN,
  RESTORE_COURSE_PORT_IN,
  UPDATE_COURSE_PORT_IN,
} from '@/modules/courses/application/ports/in';
import type {
  ICreateCoursePortIn,
  IDeleteCoursePortIn,
  IGetManagedCoursePortIn,
  IHoldCoursePortIn,
  IListManagedCoursesPortIn,
  IPublishCoursePortIn,
  IRepublishCoursePortIn,
  IRestoreCoursePortIn,
  IUpdateCoursePortIn,
} from '@/modules/courses/application/ports/in';
import {
  CreateCourseRequestDto,
  IncludeDeletedQueryDto,
  ManagedCourseQueryDto,
  UpdateCourseRequestDto,
  ManagedCourseListResponseDto,
  ManagedCourseResponseDto,
} from '@/modules/courses/presentation/http/dto';
import { CourseExceptionFilter } from '@/modules/courses/presentation/http/filters';
import {
  CourseRequestMapper,
  toManagedCourseListResponse,
  toManagedCourseResponse,
} from '@/modules/courses/presentation/http/mappers';

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
    @Inject(GET_MANAGED_COURSE_PORT_IN) private readonly getManagedCourse: IGetManagedCoursePortIn,
    @Inject(LIST_MANAGED_COURSES_PORT_IN)
    private readonly listManagedCourses: IListManagedCoursesPortIn,
  ) {}
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

  @ApiOperation({ summary: 'Create a draft course' })
  @ApiCreatedResponse({ type: ManagedCourseResponseDto })
  @Post()
  async create(
    @TrustedPrincipal() principal: Principal,
    @Body() body: CreateCourseRequestDto,
  ): Promise<ManagedCourseResponseDto> {
    return toManagedCourseResponse(
      await this.createCourse.execute(principal, CourseRequestMapper.toCreateCommand(body)),
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
      await this.updateCourse.execute(principal, id, CourseRequestMapper.toUpdateCommand(body)),
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
}
