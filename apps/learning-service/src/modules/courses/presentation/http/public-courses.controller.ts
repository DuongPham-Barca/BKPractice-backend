import { TrustedPrincipalGuard } from '@learning/modules/problems/presentation/http/guards/trusted-principal.guard';
import { Controller, Get, Inject, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
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

import {
  GET_PUBLISHED_COURSE_PORT_IN,
  LIST_PUBLISHED_COURSES_PORT_IN,
} from '@/modules/courses/application/ports/in';
import type {
  IGetPublishedCoursePortIn,
  IListPublishedCoursesPortIn,
} from '@/modules/courses/application/ports/in';
import {
  PublishedCourseQueryDto,
  CourseDetailResponseDto,
  CourseListResponseDto,
} from '@/modules/courses/presentation/http/dto';
import { CourseExceptionFilter } from '@/modules/courses/presentation/http/filters';
import {
  toCourseDetailResponse,
  toCourseListResponse,
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
export class PublicCoursesController {
  constructor(
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

  @ApiOperation({ summary: 'Get a published course by id or slug (visible problems only)' })
  @ApiOkResponse({ type: CourseDetailResponseDto })
  @Get(':idOrSlug')
  async getPublished(@Param('idOrSlug') idOrSlug: string): Promise<CourseDetailResponseDto> {
    return toCourseDetailResponse(await this.getPublishedCourse.execute(idOrSlug));
  }
}
