export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ON_HOLD';

export function isCourseStatus(value: unknown): value is CourseStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ON_HOLD';
}
