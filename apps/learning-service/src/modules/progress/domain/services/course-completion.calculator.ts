import { CompletionCount } from '@/modules/progress/domain/value-objects';

export interface VisibleCourseStructure {
  readonly courseId: string;
  readonly chapters: readonly {
    readonly chapterId: string;
    readonly problemIds: readonly string[];
  }[];
}
export interface SolvedProblem {
  readonly problemId: string;
  readonly solvedAt: Date;
}
export interface CourseCompletion {
  readonly courseId: string;
  readonly solved: number;
  readonly total: number;
  readonly chapters: readonly {
    readonly chapterId: string;
    readonly solved: number;
    readonly total: number;
  }[];
  readonly solvedProblems: readonly SolvedProblem[];
}

export class CourseCompletionCalculator {
  calculate(
    structure: VisibleCourseStructure,
    solvedById: ReadonlyMap<string, Date>,
  ): CourseCompletion {
    const solvedProblems: SolvedProblem[] = [];
    const chapters = structure.chapters.map((chapter) => {
      let solved = 0;
      for (const problemId of chapter.problemIds) {
        const solvedAt = solvedById.get(problemId);
        if (solvedAt) {
          solved++;
          solvedProblems.push({ problemId, solvedAt });
        }
      }
      const count = new CompletionCount(solved, chapter.problemIds.length);
      return { chapterId: chapter.chapterId, solved: count.solved, total: count.total };
    });
    const count = new CompletionCount(
      solvedProblems.length,
      chapters.reduce((sum, c) => sum + c.total, 0),
    );
    return {
      courseId: structure.courseId,
      solved: count.solved,
      total: count.total,
      chapters,
      solvedProblems,
    };
  }
}
