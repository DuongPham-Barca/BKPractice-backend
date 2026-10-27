import type { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import {
  TEST_USER_ID,
  buildProblem,
} from '@learning/modules/problems/domain/testing/problem-test.factory';
import { TestSuiteSummary } from '@learning/modules/problems/domain/value-objects';

import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

import { ListManagedProblemsUseCase } from './list-managed-problems.use-case';

const PRINCIPAL = {
  userId: TEST_USER_ID,
  roles: ['LECTURER'],
  permissions: ['problem:read-managed'],
};

describe('ListManagedProblemsUseCase', () => {
  it('lists owned problems with readiness for every item', async () => {
    const authorization = authorizationMock();
    const repository = repositoryMock();
    const publishValidator = publishValidatorMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({ authorization, repository, publishValidator, resultMapper });
    const problem = buildProblem();
    const readiness = { ready: false, issues: [] };
    const page = { items: [], total: 1, page: 1, limit: 20 };

    repository.listManaged.mockResolvedValue({
      items: [problem],
      total: 1,
      page: 1,
      limit: 20,
    });
    publishValidator.validate.mockReturnValue(readiness);
    resultMapper.toManagedPage.mockResolvedValue(page);

    await expect(useCase.execute(PRINCIPAL, true, 0, 500)).resolves.toBe(page);

    expect(authorization.requireManagedList).toHaveBeenCalledTimes(1);
    expect(repository.listManaged).toHaveBeenCalledWith({
      ownerId: TEST_USER_ID,
      includeDeleted: true,
      page: 1,
      limit: 100,
    });
    expect(publishValidator.validate).toHaveBeenCalledWith(problem, { slugAvailable: true });
    expect(resultMapper.toManagedPage).toHaveBeenCalledWith(
      [problem],
      1,
      1,
      20,
      new Map([[problem.id.value, readiness]]),
    );
  });

  it('builds an empty readiness map for an empty page', async () => {
    const repository = repositoryMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({ repository, resultMapper });

    repository.listManaged.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await useCase.execute(PRINCIPAL, false, 1, 20);

    expect(resultMapper.toManagedPage).toHaveBeenCalledWith([], 0, 1, 20, new Map());
  });

  it('normalizes invalid pagination input', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });

    await useCase.execute(PRINCIPAL, false, Number.NaN, 0);

    expect(repository.listManaged).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('does not query the repository when the principal lacks the managed list gate', async () => {
    const authorization = authorizationMock();
    const repository = repositoryMock();
    const useCase = createUseCase({ authorization, repository });

    authorization.requireManagedList.mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(useCase.execute(PRINCIPAL, false, 1, 20)).rejects.toThrow('forbidden');
    expect(repository.listManaged).not.toHaveBeenCalled();
  });
});

function createUseCase(dependencies: {
  authorization?: ReturnType<typeof authorizationMock>;
  repository?: ReturnType<typeof repositoryMock>;
  publishValidator?: ReturnType<typeof publishValidatorMock>;
  resultMapper?: ReturnType<typeof resultMapperMock>;
}): ListManagedProblemsUseCase {
  const {
    authorization = authorizationMock(),
    repository = repositoryMock(),
    publishValidator = publishValidatorMock(),
    resultMapper = resultMapperMock(),
  } = dependencies;

  return new ListManagedProblemsUseCase(
    authorization as unknown as ProblemAuthorizationService,
    repository,
    publishValidator as unknown as PublishValidator,
    resultMapper as unknown as ProblemResultMapper,
  );
}

function authorizationMock() {
  return {
    requireCreate: jest.fn(),
    requireManagedList: jest.fn(),
    requireOwned: jest.fn(),
  };
}

function repositoryMock() {
  return {
    findById: jest.fn(),
    loadForUpdate: jest.fn(),
    loadTestSuiteSummary: jest.fn().mockResolvedValue(TestSuiteSummary.empty()),
    findByIdIncludingDeleted: jest.fn(),
    findPublishedByIdOrSlug: jest.fn(),
    findManagedById: jest.fn(),
    listPublished: jest.fn(),
    listManaged: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    isSlugAvailable: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
}

function publishValidatorMock() {
  return { validate: jest.fn().mockReturnValue({ ready: true, issues: [] }) };
}

function resultMapperMock() {
  return {
    toSummary: jest.fn(),
    toDetail: jest.fn(),
    toManagedSummary: jest.fn(),
    toManagedDetail: jest.fn(),
    toPage: jest.fn(),
    toManagedPage: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
  };
}
