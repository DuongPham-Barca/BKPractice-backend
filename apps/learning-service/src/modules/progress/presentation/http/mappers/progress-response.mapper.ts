import type {
  SolvedStatusResult,
  CourseProgressResult,
} from '@/modules/progress/application/results';
import type { SolvedProblemPage } from '@/modules/progress/domain/repositories';
import type {
  CourseProgressResponseDto,
  SolvedProblemPageResponseDto,
  SolvedStatusResponseDto,
} from '@/modules/progress/presentation/http/dto';

export function toSolvedProblemPageResponse(
  result: SolvedProblemPage,
): SolvedProblemPageResponseDto {
  return {
    items: result.items.map((p) => ({
      problemId: p.problemId,
      solvedAt: p.solvedAt.toISOString(),
    })),
    page: result.page,
    limit: result.limit,
    total: result.total,
  };
}
export function toSolvedStatusResponse(
  result: readonly SolvedStatusResult[],
): SolvedStatusResponseDto[] {
  return result.map((p) => ({
    problemId: p.problemId,
    solved: p.solved,
    solvedAt: p.solvedAt?.toISOString() ?? null,
  }));
}
export function toCourseProgressResponse(result: CourseProgressResult): CourseProgressResponseDto {
  return {
    courseId: result.courseId,
    solved: result.solved,
    total: result.total,
    chapters: result.chapters.map((c) => ({
      chapterId: c.chapterId,
      solved: c.solved,
      total: c.total,
    })),
    solvedProblems: result.solvedProblems.map((p) => ({
      problemId: p.problemId,
      solvedAt: p.solvedAt.toISOString(),
    })),
  };
}
