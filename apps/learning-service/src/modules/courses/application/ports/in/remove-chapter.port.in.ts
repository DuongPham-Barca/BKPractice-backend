import type { Principal } from '@/modules/courses/application/models';
import type { ChapterId } from '@/modules/courses/domain/value-objects';

export interface IRemoveChapterPortIn {
  execute(principal: Principal, courseId: string, chapterId: ChapterId, now?: Date): Promise<void>;
}

export const REMOVE_CHAPTER_PORT_IN = Symbol('REMOVE_CHAPTER_PORT_IN');
