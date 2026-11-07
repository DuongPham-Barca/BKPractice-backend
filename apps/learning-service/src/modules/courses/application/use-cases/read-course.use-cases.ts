import { CourseNotFoundError } from '@learning/modules/courses/application/errors/application-errors';
import type { Principal } from '@learning/modules/courses/application/models/principal';
import type {
  CourseListFilter,
  CoursePage,
  CourseRepository,
} from '@learning/modules/courses/application/ports/out/course-repository.port.out';
import type {
  LearnerCourseResult,
  LearnerCourseSummaryResult,
  ManagedCourseResult,
  ManagedCourseSummaryResult,
} from '@learning/modules/courses/application/results/course.results';
import { CourseAuthorizationService } from '@learning/modules/courses/application/services/course-authorization.service';
import { CourseViewAssembler } from '@learning/modules/courses/application/services/course-view.assembler';
import { COURSE_REPOSITORY } from '@learning/modules/courses/course.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class GetManagedCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(
    principal: Principal,
    courseId: string,
    includeDeleted: boolean,
  ): Promise<ManagedCourseResult> {
    this.authorization.requirePermission(principal, 'course:read-managed');
    const course = await this.repository.findManagedById(courseId, includeDeleted);
    if (!course) throw new CourseNotFoundError('Course not found');
    return this.views.toManaged(course);
  }
}

@Injectable()
export class ListManagedCoursesUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(
    principal: Principal,
    includeDeleted: boolean,
    page: number,
    limit: number,
    search?: string,
  ): Promise<CoursePage<ManagedCourseSummaryResult>> {
    this.authorization.requirePermission(principal, 'course:read-managed');
    const result = await this.repository.listManaged({
      includeDeleted,
      page,
      limit,
      search,
    });
    return { ...result, items: result.items.map((c) => this.views.toManagedSummary(c)) };
  }
}

@Injectable()
export class GetPublishedCourseUseCase {
  constructor(
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(idOrSlug: string): Promise<LearnerCourseResult> {
    const course = await this.repository.findPublishedByIdOrSlug(idOrSlug);
    if (!course) throw new CourseNotFoundError('Course not found');
    return this.views.toLearner(course);
  }
}

@Injectable()
export class ListPublishedCoursesUseCase {
  constructor(
    private readonly views: CourseViewAssembler,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}

  async execute(filter: CourseListFilter): Promise<CoursePage<LearnerCourseSummaryResult>> {
    const result = await this.repository.listPublished(filter);
    return { ...result, items: result.items.map((c) => this.views.toLearnerSummary(c)) };
  }
}
