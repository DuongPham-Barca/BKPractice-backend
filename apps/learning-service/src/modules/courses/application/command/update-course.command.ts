import type { CourseTitle, CourseDescription } from '@/modules/courses/domain/value-objects';

export interface UpdateCourseCommand {
  readonly title?: CourseTitle;
  readonly description?: CourseDescription;
}
