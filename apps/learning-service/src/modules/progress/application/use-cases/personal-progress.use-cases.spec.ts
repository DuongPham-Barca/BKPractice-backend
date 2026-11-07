import { GetMyCourseProgressUseCase } from './get-my-course-progress.use-case';
import { GetMySolvedStatusUseCase } from './get-my-solved-status.use-case';
import { ListMySolvedProblemsUseCase } from './list-my-solved-problems.use-case';

import { CourseProgressNotFoundError } from '@/modules/progress/application/errors';
import type {
  CourseStructureReader,
  PublishedProblemFilter,
} from '@/modules/progress/application/ports/out';
import type { ProgressRepository } from '@/modules/progress/domain/repositories';
import { CourseCompletionCalculator } from '@/modules/progress/domain/services';

const principal = { userId: 'me', roles: ['STUDENT'], permissions: [] };
const solvedAt = new Date('2026-11-07T00:00:00Z');
function createRepository(): jest.Mocked<ProgressRepository> {
  return {
    recordReceipt: jest.fn(),
    insertIfAbsent: jest.fn(),
    loadForUpdate: jest.fn(),
    save: jest.fn(),
    findSolved: jest.fn().mockResolvedValue(new Map()),
    listSolved: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
  };
}

describe('Personal progress use cases', () => {
  it('lists only for the trusted caller and passes pagination to the repository', async () => {
    const repository = createRepository();
    const expected = { items: [{ problemId: 'visible', solvedAt }], page: 2, limit: 5, total: 6 };
    repository.listSolved.mockResolvedValue(expected);
    const useCase = new ListMySolvedProblemsUseCase(repository);
    expect(await useCase.execute(principal, 2, 5)).toEqual(expected);
    expect(repository.listSolved).toHaveBeenCalledWith('me', 2, 5);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves status input order and hides solved status/timestamps for unpublished Problems', async () => {
    const repository = createRepository();
    repository.findSolved.mockResolvedValue(
      new Map([
        ['visible', solvedAt],
        ['hidden', solvedAt],
      ]),
    );
    const filter: PublishedProblemFilter = {
      findPublishedIds: jest.fn().mockResolvedValue(new Set(['visible', 'unsolved'])),
    };
    const useCase = new GetMySolvedStatusUseCase(repository, filter);
    expect(await useCase.execute(principal, ['missing', 'visible', 'hidden', 'unsolved'])).toEqual([
      { problemId: 'missing', solved: false, solvedAt: null },
      { problemId: 'visible', solved: true, solvedAt },
      { problemId: 'hidden', solved: false, solvedAt: null },
      { problemId: 'unsolved', solved: false, solvedAt: null },
    ]);
    expect(repository.findSolved).toHaveBeenCalledWith('me', ['visible', 'unsolved']);
  });

  it('returns not found before reading progress for an unavailable Course', async () => {
    const repository = createRepository();
    const reader: CourseStructureReader = {
      loadVisibleStructure: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetMyCourseProgressUseCase(
      repository,
      reader,
      new CourseCompletionCalculator(),
    );
    await expect(useCase.execute(principal, 'hidden')).rejects.toBeInstanceOf(
      CourseProgressNotFoundError,
    );
    expect(repository.findSolved).not.toHaveBeenCalled();
  });

  it('loads progress only for visible Problems and the trusted caller', async () => {
    const repository = createRepository();
    repository.findSolved.mockResolvedValue(new Map([['visible', solvedAt]]));
    const reader: CourseStructureReader = {
      loadVisibleStructure: jest.fn().mockResolvedValue({
        courseId: 'course',
        chapters: [{ chapterId: 'chapter', problemIds: ['visible', 'unsolved'] }],
      }),
    };
    const useCase = new GetMyCourseProgressUseCase(
      repository,
      reader,
      new CourseCompletionCalculator(),
    );
    expect(await useCase.execute(principal, 'course')).toMatchObject({ solved: 1, total: 2 });
    expect(repository.findSolved).toHaveBeenCalledWith('me', ['visible', 'unsolved']);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates infrastructure errors instead of returning partial progress', async () => {
    const repository = createRepository();
    const reader: CourseStructureReader = {
      loadVisibleStructure: jest.fn().mockRejectedValue(new Error('unavailable')),
    };
    const useCase = new GetMyCourseProgressUseCase(
      repository,
      reader,
      new CourseCompletionCalculator(),
    );
    await expect(useCase.execute(principal, 'course')).rejects.toThrow('unavailable');
  });
});
