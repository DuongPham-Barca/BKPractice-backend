import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import { PublishNotReadyError } from '@learning/modules/problems/application/errors/publish-not-ready.error';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import type { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import {
  TEST_NOW,
  TEST_USER_ID,
  buildProblem,
} from '@learning/modules/problems/domain/testing/problem-test.factory';

import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

import { PublishProblemUseCase } from './publish-problem.use-case';

const PRINCIPAL = {
  userId: TEST_USER_ID,
  roles: ['LECTURER'],
  permissions: ['problem:publish'],
};

describe('PublishProblemUseCase', () => {
  it('publishes a ready draft, saves it and returns the managed detail', async () => {
    const repository = repositoryMock();
    const publishValidator = publishValidatorMock();
    const transactionRunner = transactionRunnerMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({
      repository,
      publishValidator,
      transactionRunner,
      resultMapper,
    });
    const problem = buildProblem();
    const expectedUpdatedAt = problem.updatedAt;
    const detail = { id: problem.id.value };

    repository.findById.mockResolvedValue(problem);
    repository.isSlugAvailable.mockResolvedValue(true);
    publishValidator.validate.mockReturnValue({ ready: true, issues: [] });
    resultMapper.toManagedDetail.mockResolvedValue(detail);

    await expect(useCase.execute(PRINCIPAL, problem.id.value)).resolves.toBe(detail);

    expect(problem.publishStatus).toBe('PUBLISHED');
    expect(repository.isSlugAvailable).toHaveBeenCalledWith(problem.slug.value, problem.id.value);
    expect(repository.save).toHaveBeenCalledWith(problem, expectedUpdatedAt);
    expect(resultMapper.toManagedDetail).toHaveBeenCalledWith(problem, {
      ready: true,
      issues: [],
    });
  });

  it('throws when the problem does not exist', async () => {
    const repository = repositoryMock();
    const authorization = authorizationMock();
    const useCase = createUseCase({ repository, authorization });

    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(PRINCIPAL, 'missing')).rejects.toBeInstanceOf(
      ProblemNotFoundError,
    );
    expect(authorization.requireOwned).not.toHaveBeenCalled();
  });

  it('rejects a problem that is not ready without saving', async () => {
    const repository = repositoryMock();
    const publishValidator = publishValidatorMock();
    const useCase = createUseCase({ repository, publishValidator });
    const problem = buildProblem();

    repository.findById.mockResolvedValue(problem);
    repository.isSlugAvailable.mockResolvedValue(true);
    publishValidator.validate.mockReturnValue({
      ready: false,
      issues: [{ code: 'ENABLED_LANGUAGE_REQUIRED', message: 'no language' }],
    });

    await expect(useCase.execute(PRINCIPAL, problem.id.value)).rejects.toBeInstanceOf(
      PublishNotReadyError,
    );
    expect(problem.publishStatus).toBe('DRAFT');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not save when ownership or permission checks fail', async () => {
    const authorization = authorizationMock();
    const repository = repositoryMock();
    const useCase = createUseCase({ authorization, repository });
    const problem = buildProblem();

    repository.findById.mockResolvedValue(problem);
    authorization.requireOwned.mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(useCase.execute(PRINCIPAL, problem.id.value)).rejects.toThrow('forbidden');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing a problem that is not a draft', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });
    const problem = buildProblem();

    problem.publish(TEST_NOW);
    repository.findById.mockResolvedValue(problem);
    repository.isSlugAvailable.mockResolvedValue(true);

    await expect(useCase.execute(PRINCIPAL, problem.id.value)).rejects.toMatchObject({
      code: 'INVALID_PROBLEM_STATE',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
});

function createUseCase(dependencies: {
  authorization?: ReturnType<typeof authorizationMock>;
  repository?: ReturnType<typeof repositoryMock>;
  publishValidator?: ReturnType<typeof publishValidatorMock>;
  transactionRunner?: ReturnType<typeof transactionRunnerMock>;
  resultMapper?: ReturnType<typeof resultMapperMock>;
}): PublishProblemUseCase {
  const {
    authorization = authorizationMock(),
    repository = repositoryMock(),
    publishValidator = publishValidatorMock(),
    transactionRunner = transactionRunnerMock(),
    resultMapper = resultMapperMock(),
  } = dependencies;

  return new PublishProblemUseCase(
    authorization as unknown as ProblemAuthorizationService,
    repository,
    publishValidator as unknown as PublishValidator,
    transactionRunner as unknown as TransactionRunner,
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
    findByIdIncludingDeleted: jest.fn(),
    findPublishedByIdOrSlug: jest.fn(),
    findManagedById: jest.fn(),
    listPublished: jest.fn(),
    listManaged: jest.fn(),
    isSlugAvailable: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
}

function publishValidatorMock() {
  return { validate: jest.fn().mockReturnValue({ ready: true, issues: [] }) };
}

function transactionRunnerMock() {
  return { run: jest.fn((work: () => Promise<unknown>) => work()) };
}

function resultMapperMock() {
  return {
    toSummary: jest.fn(),
    toDetail: jest.fn(),
    toManagedSummary: jest.fn(),
    toManagedDetail: jest.fn().mockResolvedValue({ id: 'problem' }),
    toPage: jest.fn(),
    toManagedPage: jest.fn(),
  };
}
