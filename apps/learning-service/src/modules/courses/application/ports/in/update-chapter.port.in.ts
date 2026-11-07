import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import type {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
} from '@/modules/courses/domain/value-objects';

export interface IUpdateChapterPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    title: ChapterTitle | undefined,
    description: ChapterDescription | undefined,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const UPDATE_CHAPTER_PORT_IN = Symbol('UPDATE_CHAPTER_PORT_IN');
