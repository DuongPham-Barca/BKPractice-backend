import type { Course } from '@learning/modules/courses/domain/course.aggregate';

export interface CourseListFilter {
  readonly search?: string;
  readonly page: number;
  readonly limit: number;
}

export interface ManagedCourseListFilter {
  readonly ownerId: string;
  readonly includeDeleted: boolean;
  readonly page: number;
  readonly limit: number;
}

export interface CoursePage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  findByIdIncludingDeleted(id: string): Promise<Course | null>;
  findPublishedByIdOrSlug(idOrSlug: string): Promise<Course | null>;
  findManagedById(id: string, ownerId: string, includeDeleted: boolean): Promise<Course | null>;
  loadForUpdate(id: string, includeDeleted?: boolean): Promise<Course | null>;
  listPublished(filter: CourseListFilter): Promise<CoursePage<Course>>;
  listManaged(filter: ManagedCourseListFilter): Promise<CoursePage<Course>>;
  isSlugAvailable(slug: string, excludeCourseId?: string): Promise<boolean>;
  save(course: Course, expectedUpdatedAt?: Date): Promise<void>;
  hardDelete(id: string, ownerId: string): Promise<boolean>;
}

export interface CourseReferenceChecker {
  isProblemAttachable(
    problemId: string,
    principalUserId: string,
  ): Promise<{
    attachable: boolean;
    createdBy: string | undefined;
    publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD' | undefined;
    isDeleted: boolean | undefined;
  }>;
  hasCourseReferences(courseId: string): Promise<boolean>;
  getProblemState(problemId: string): Promise<{
    publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD' | undefined;
    isDeleted: boolean | undefined;
  }>;
}
