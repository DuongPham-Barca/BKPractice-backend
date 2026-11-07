import type { Principal } from '@/modules/courses/application/models';
import type { ManagedCourseResult } from '@/modules/courses/application/results';
import type { ChapterDescription, ChapterTitle } from '@/modules/courses/domain/value-objects';

export interface IAddChapterPortIn {
  execute(
    principal: Principal,
    courseId: string,
    title: ChapterTitle,
    description?: ChapterDescription | null,
    position?: number,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}

export const ADD_CHAPTER_PORT_IN = Symbol('ADD_CHAPTER_PORT_IN');
