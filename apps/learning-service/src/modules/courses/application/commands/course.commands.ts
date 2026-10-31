import type {
  CourseSlug,
  CourseTitle,
  CourseDescription,
} from '@learning/modules/courses/domain/value-objects';

export interface CreateCourseCommand {
  readonly slug: CourseSlug;
  readonly title: CourseTitle;
  readonly description: CourseDescription | null;
}

export interface UpdateCourseCommand {
  readonly title?: CourseTitle;
  readonly description?: CourseDescription;
}
