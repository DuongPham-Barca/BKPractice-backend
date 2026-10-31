import { ChapterDescription, ChapterTitle } from './course-content';
import { ProblemReference } from './identifiers';
import { ChapterId } from './identifiers';

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
