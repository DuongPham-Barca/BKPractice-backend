import type { CoursePage } from '@learning/modules/courses/application/ports/out/course-repository.port';
import type { Course } from '@learning/modules/courses/domain/course.aggregate';
import type {
  CourseListResponseDto,
  CourseResponseDto,
} from '@learning/modules/courses/presentation/http/dto/course.response.dto';

export function toCourseResponse(course: Course): CourseResponseDto {
  const snapshot = course.toSnapshot();
  return {
    id: snapshot.id.value,
    slug: snapshot.slug.value,
    title: snapshot.title.value,
    description: snapshot.description.value,
    status: snapshot.status,
    deletedAt: snapshot.deletedMarker.deletedAt?.toISOString() ?? null,
    chapters: snapshot.chapters.map((chapter) => ({
      id: chapter.id.value,
      title: chapter.title.value,
      description: chapter.description.value,
      problemIds: chapter.problemRefs.map((ref) => ref.value),
    })),
    createdBy: snapshot.createdBy.value,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toCourseListResponse(page: CoursePage<Course>): CourseListResponseDto {
  return {
    items: page.items.map(toCourseResponse),
    total: page.total,
    page: page.page,
    limit: page.limit,
  };
}
