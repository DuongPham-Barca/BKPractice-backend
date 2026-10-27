import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import {
  TEST_PROBLEM_ID,
  buildProblem,
} from '@learning/modules/problems/domain/testing/problem-test.factory';

import type { ProblemResultMapper } from '../results/problem-result.mapper';

import { GetPublicProblemUseCase } from './get-public-problem.use-case';

describe('GetPublicProblemUseCase', () => {
  it('returns the mapped detail for a published problem', async () => {
    const repository = repositoryMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({ repository, resultMapper });
    const problem = buildProblem();
    const detail = { id: problem.id.value };

    repository.findPublishedByIdOrSlug.mockResolvedValue(problem);
    resultMapper.toDetail.mockResolvedValue(detail);

    await expect(useCase.execute('two-sum')).resolves.toBe(detail);
    expect(repository.findPublishedByIdOrSlug).toHaveBeenCalledWith('two-sum');
    expect(resultMapper.toDetail).toHaveBeenCalledWith(problem);
  });

  it('throws when the problem is not published or does not exist', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });

    repository.findPublishedByIdOrSlug.mockResolvedValue(null);

    await expect(useCase.execute(TEST_PROBLEM_ID)).rejects.toBeInstanceOf(ProblemNotFoundError);
  });
});

function createUseCase(dependencies: {
  repository?: ReturnType<typeof repositoryMock>;
  resultMapper?: ReturnType<typeof resultMapperMock>;
}): GetPublicProblemUseCase {
  const { repository = repositoryMock(), resultMapper = resultMapperMock() } = dependencies;

  return new GetPublicProblemUseCase(repository, resultMapper as unknown as ProblemResultMapper);
}

function repositoryMock() {
  return {
    findById: jest.fn(),
    findByIdIncludingDeleted: jest.fn(),
    findPublishedByIdOrSlug: jest.fn(),
    findManagedById: jest.fn(),
    listPublished: jest.fn(),
    listManaged: jest.fn(),
    isSlugAvailable: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
}

function resultMapperMock() {
  return {
    toSummary: jest.fn(),
    toDetail: jest.fn(),
    toManagedSummary: jest.fn(),
    toManagedDetail: jest.fn(),
    toPage: jest.fn(),
    toManagedPage: jest.fn(),
  };
}
