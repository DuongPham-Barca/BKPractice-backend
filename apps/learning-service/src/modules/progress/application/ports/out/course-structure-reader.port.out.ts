import type { VisibleCourseStructure } from '@/modules/progress/domain/services';
export interface CourseStructureReader {
  loadVisibleStructure(courseId: string): Promise<VisibleCourseStructure | null>;
}
