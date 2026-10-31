import { COURSE_REPOSITORY } from '@learning/modules/courses/course.tokens';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import { Inject, Injectable } from '@nestjs/common';

import { CourseNotFoundError } from '../errors/application-errors';
import type { Principal } from '../models/principal';
import type { CourseRepository } from '../ports/out/course-repository.port';
import type { CourseListFilter, CoursePage } from '../ports/out/course-repository.port';
import { CourseAuthorizationService } from '../services/course-authorization.service';

@Injectable()
export class GetManagedCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}
  async execute(principal: Principal, courseId: string, includeDeleted: boolean): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:read-managed');
    const course = await this.repository.findManagedById(
      courseId,
      principal.userId,
      includeDeleted,
    );
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    return course;
  }
}

@Injectable()
export class ListManagedCoursesUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}
  async execute(
    principal: Principal,
    includeDeleted: boolean,
    page: number,
    limit: number,
  ): Promise<CoursePage<Course>> {
    this.authorization.requirePermission(principal, 'course:read-managed');
    return this.repository.listManaged({ ownerId: principal.userId, includeDeleted, page, limit });
  }
}

@Injectable()
export class GetPublishedCourseUseCase {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository) {}
  async execute(idOrSlug: string): Promise<Course> {
    const course = await this.repository.findPublishedByIdOrSlug(idOrSlug);
    if (!course) throw new CourseNotFoundError('Course not found');
    return course;
  }
}

@Injectable()
export class ListPublishedCoursesUseCase {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository) {}
  async execute(filter: CourseListFilter): Promise<CoursePage<Course>> {
    return this.repository.listPublished(filter);
  }
}

@Injectable()
export class PreviewCourseUseCase {
  constructor(
    private readonly authorization: CourseAuthorizationService,
    @Inject(COURSE_REPOSITORY) private readonly repository: CourseRepository,
  ) {}
  async execute(principal: Principal, courseId: string): Promise<Course> {
    this.authorization.requirePermission(principal, 'course:read-managed');
    const course = await this.repository.findManagedById(courseId, principal.userId, true);
    if (!course) throw new CourseNotFoundError('Course not found');
    this.authorization.requireOwnership(course.createdBy.value, principal);
    return course;
  }
}
