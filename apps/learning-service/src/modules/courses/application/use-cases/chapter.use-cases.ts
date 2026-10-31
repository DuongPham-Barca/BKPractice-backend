import type {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
} from '@learning/modules/courses/domain/value-objects';
import { Injectable } from '@nestjs/common';

import type { Principal } from '../models/principal';
import type { ManagedCourseResult } from '../results/course.results';
import { CourseMutationService } from '../services/course-mutation.service';
import { CoursePublishReadinessService } from '../services/course-publish-readiness.service';

@Injectable()
export class AddChapterUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(
    principal: Principal,
    courseId: string,
    title: ChapterTitle,
    description: ChapterDescription | null = null,
    position?: number,
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, (course) => {
      course.addChapter({ title, description, position }, now);
    });
  }
}

@Injectable()
export class UpdateChapterUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    title: ChapterTitle | undefined,
    description: ChapterDescription | undefined,
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, (course) => {
      course.updateChapter(chapterId, { title, description }, now);
    });
  }
}

@Injectable()
export class RemoveChapterUseCase {
  constructor(
    private readonly mutation: CourseMutationService,
    private readonly readiness: CoursePublishReadinessService,
  ) {}

  async execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    now = new Date(),
  ): Promise<void> {
    await this.mutation.mutate(principal, 'course:update', courseId, async (course) => {
      course.removeChapter(chapterId, now);
      if (course.isPublished) await this.readiness.assertReady(course);
    });
  }
}

@Injectable()
export class ReorderChaptersUseCase {
  constructor(private readonly mutation: CourseMutationService) {}

  execute(
    principal: Principal,
    courseId: string,
    orderedIds: readonly ChapterId[],
    now = new Date(),
  ): Promise<ManagedCourseResult> {
    return this.mutation.mutate(principal, 'course:update', courseId, (course) => {
      course.reorderChapters(orderedIds, now);
    });
  }
}
