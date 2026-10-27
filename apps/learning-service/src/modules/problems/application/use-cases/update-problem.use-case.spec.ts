import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import { PublishNotReadyError } from '@learning/modules/problems/application/errors/publish-not-ready.error';
import { UnknownReferenceError } from '@learning/modules/problems/application/errors/unknown-reference.error';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import type { ContentFormatValidator } from '@learning/modules/problems/domain/services/content-format.validator';
import type { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import {
  TEST_NOW,
  TEST_USER_ID,
  buildProblem,
} from '@learning/modules/problems/domain/testing/problem-test.factory';
import { ProblemTitle } from '@learning/modules/problems/domain/value-objects';

import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

import { UpdateProblemUseCase } from './update-problem.use-case';

const PRINCIPAL = {
  userId: TEST_USER_ID,
  roles: ['LECTURER'],
  permissions: ['problem:update'],
};

describe('UpdateProblemUseCase', () => {
  it('updates a draft, saves it optimistically and returns the managed detail', async () => {
    const repository = repositoryMock();
    const topicTagReader = topicTagReaderMock();
    const contentValidator = contentValidatorMock();
    const transactionRunner = transactionRunnerMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({
      repository,
      topicTagReader,
      contentValidator,
      transactionRunner,
      resultMapper,
    });
    const problem = buildProblem();
    const expectedUpdatedAt = problem.updatedAt;
    const detail = { id: problem.id.value };

    repository.findById.mockResolvedValue(problem);
    resultMapper.toManagedDetail.mockResolvedValue(detail);

    await expect(
      useCase.execute(PRINCIPAL, problem.id.value, { title: new ProblemTitle('Updated title') }),
    ).resolves.toBe(detail);

    expect(problem.title.value).toBe('Updated title');
    expect(contentValidator.assertSafe).toHaveBeenCalledWith(problem);
    expect(repository.save).toHaveBeenCalledWith(problem, expectedUpdatedAt);
    expect(topicTagReader.findMissingTopicIds).not.toHaveBeenCalled();
  });

  it('clears a nullable field when the command explicitly passes null', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });
    const problem = buildProblem();

    expect(problem.inputSpecification).not.toBeNull();
    repository.findById.mockResolvedValue(problem);

    await useCase.execute(PRINCIPAL, problem.id.value, { inputSpecification: null });

    expect(problem.inputSpecification).toBeNull();
  });

  it('throws when the problem does not exist', async () => {
    const repository = repositoryMock();
    const authorization = authorizationMock();
    const useCase = createUseCase({ repository, authorization });

    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute(PRINCIPAL, 'missing', {})).rejects.toBeInstanceOf(
      ProblemNotFoundError,
    );
    expect(authorization.requireOwned).not.toHaveBeenCalled();
  });

  it('rejects updating a problem on hold', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });
    const problem = buildProblem();

    problem.publish(TEST_NOW);
    problem.hold(TEST_NOW);
    repository.findById.mockResolvedValue(problem);

    await expect(
      useCase.execute(PRINCIPAL, problem.id.value, { title: new ProblemTitle('Updated') }),
    ).rejects.toMatchObject({ code: 'INVALID_PROBLEM_STATE' });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects changing the problem type outside a draft', async () => {
    const repository = repositoryMock();
    const useCase = createUseCase({ repository });
    const problem = buildProblem();

    problem.publish(TEST_NOW);
    repository.findById.mockResolvedValue(problem);

    await expect(
      useCase.execute(PRINCIPAL, problem.id.value, { problemType: 'FUNCTION' }),
    ).rejects.toMatchObject({ code: 'INVALID_PROBLEM_STATE' });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects unknown topic and tag references', async () => {
    const repository = repositoryMock();
    const topicTagReader = topicTagReaderMock();
    const useCase = createUseCase({ repository, topicTagReader });
    const problem = buildProblem();

    repository.findById.mockResolvedValue(problem);
    topicTagReader.findMissingTopicIds.mockResolvedValue(['missing-topic']);
    topicTagReader.findMissingTagIds.mockResolvedValue(['missing-tag']);

    await expect(
      useCase.execute(PRINCIPAL, problem.id.value, {
        topicIds: ['missing-topic'],
        tagIds: ['missing-tag'],
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a published update that makes the problem not ready', async () => {
    const repository = repositoryMock();
    const publishValidator = publishValidatorMock();
    const useCase = createUseCase({ repository, publishValidator });
    const problem = buildProblem();

    problem.publish(TEST_NOW);
    repository.findById.mockResolvedValue(problem);
    publishValidator.validate.mockReturnValue({
      ready: false,
      issues: [{ code: 'ENABLED_LANGUAGE_REQUIRED', message: 'no language' }],
    });

    await expect(
      useCase.execute(PRINCIPAL, problem.id.value, { title: new ProblemTitle('Updated') }),
    ).rejects.toBeInstanceOf(PublishNotReadyError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('saves a published update that remains ready and revalidates before returning', async () => {
    const repository = repositoryMock();
    const publishValidator = publishValidatorMock();
    const resultMapper = resultMapperMock();
    const useCase = createUseCase({ repository, publishValidator, resultMapper });
    const problem = buildProblem();

    problem.publish(TEST_NOW);
    repository.findById.mockResolvedValue(problem);

    await useCase.execute(PRINCIPAL, problem.id.value, { title: new ProblemTitle('Updated') });

    expect(publishValidator.validate).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(resultMapper.toManagedDetail).toHaveBeenCalledWith(
      problem,
      expect.objectContaining({ ready: true }),
    );
  });
});

function createUseCase(dependencies: {
  authorization?: ReturnType<typeof authorizationMock>;
  topicTagReader?: ReturnType<typeof topicTagReaderMock>;
  repository?: ReturnType<typeof repositoryMock>;
  contentValidator?: ReturnType<typeof contentValidatorMock>;
  publishValidator?: ReturnType<typeof publishValidatorMock>;
  transactionRunner?: ReturnType<typeof transactionRunnerMock>;
  resultMapper?: ReturnType<typeof resultMapperMock>;
}): UpdateProblemUseCase {
  const {
    authorization = authorizationMock(),
    topicTagReader = topicTagReaderMock(),
    repository = repositoryMock(),
    contentValidator = contentValidatorMock(),
    publishValidator = publishValidatorMock(),
    transactionRunner = transactionRunnerMock(),
    resultMapper = resultMapperMock(),
  } = dependencies;

  return new UpdateProblemUseCase(
    authorization as unknown as ProblemAuthorizationService,
    topicTagReader,
    repository,
    contentValidator as unknown as ContentFormatValidator,
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

function topicTagReaderMock() {
  return {
    findMissingTopicIds: jest.fn().mockResolvedValue([]),
    findMissingTagIds: jest.fn().mockResolvedValue([]),
    findTopicNames: jest.fn(),
    findTagNames: jest.fn(),
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
    isSlugAvailable: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
}

function contentValidatorMock() {
  return { assertSafe: jest.fn() };
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
