import {
  ChapterDescription,
  ChapterTitle,
} from '@/modules/courses/domain/value-objects/course-content';
import { ProblemReference, ChapterId } from '@/modules/courses/domain/value-objects/identifiers';

export { ChapterDescription, ChapterId, ChapterTitle, ProblemReference };

export interface ChapterProblemRef {
  readonly problemId: ProblemReference;
  readonly displayOrder: number;
}

export interface Chapter {
  readonly id: ChapterId;
  readonly title: ChapterTitle;
  readonly description: ChapterDescription;
  readonly problemRefs: readonly ProblemReference[];
}
