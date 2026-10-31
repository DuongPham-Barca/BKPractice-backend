import { Course as CourseAggregate } from '@learning/modules/courses/domain/course.aggregate';
import {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
  CourseDescription,
  CourseId,
  CourseSlug,
  CourseTitle,
  CreatedBy,
  DeletedMarker,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';
import { Course } from '@learning/modules/courses/entities/course.entity';
import type { Chapter, ChapterProblem } from '@learning/modules/courses/entities/course.entity';

export class CoursePersistenceMapper {
  static toDomain(
    entity: Course,
    chapters: Chapter[],
    chapterProblems: ChapterProblem[],
  ): CourseAggregate {
    const chapterList = chapters
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((chapter) => {
        const refs = chapterProblems
          .filter((cp) => cp.chapterId === chapter.id)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cp) => new ProblemReference(cp.problemId));
        return {
          id: ChapterId.from(chapter.id),
          title: new ChapterTitle(chapter.title),
          description: new ChapterDescription(chapter.description),
          problemRefs: refs,
        };
      });

    return CourseAggregate.rehydrate({
      id: CourseId.from(entity.id),
      slug: new CourseSlug(entity.slug),
      title: new CourseTitle(entity.title),
      description: new CourseDescription(entity.description),
      status: entity.status,
      deletedMarker: entity.deletedAt ? DeletedMarker.at(entity.deletedAt) : DeletedMarker.none(),
      chapters: chapterList,
      createdBy: new CreatedBy(entity.createdBy),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(course: CourseAggregate): Course {
    const entity = new Course();
    entity.id = course.id.value;
    entity.title = course.title.value;
    entity.slug = course.slug.value;
    entity.description = course.description.value;
    entity.createdBy = course.createdBy.value;
    entity.status = course.status;
    entity.deletedAt = course.deletedMarker.deletedAt;
    entity.createdAt = course.createdAt;
    entity.updatedAt = course.updatedAt;
    return entity;
  }
}
