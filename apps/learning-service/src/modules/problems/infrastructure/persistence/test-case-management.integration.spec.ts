import type { SupportedLanguage } from '@app/contracts';
import { InitialLearningSchema1700000003000 } from '@learning/database/migrations/1700000003000-InitialLearningSchema';
import { Lrn001ProblemManagement1700000004000 } from '@learning/database/migrations/1700000004000-Lrn001ProblemManagement';
import { Lrn002TestCaseManagement1700000007000 } from '@learning/database/migrations/1700000007000-Lrn002TestCaseManagement';
import { learningEntities } from '@learning/modules/learning.entities';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import { TestSuiteReadinessService } from '@learning/modules/problems/application/services/test-suite-readiness.service';
import { AddTestCaseUseCase } from '@learning/modules/problems/application/use-cases/add-test-case.use-case';
import { RemoveTestCaseUseCase } from '@learning/modules/problems/application/use-cases/remove-test-case.use-case';
import { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { TestCase } from '@learning/modules/problems/domain/test-case.aggregate';
import {
  CreatedBy,
  DisplayOrder,
  EnabledLanguage,
  FunctionContract,
  ExecutionLimits,
  ExpectedOutput,
  ProblemStatement,
  ProblemTitle,
  Slug,
  TestCaseInput,
  TestCaseScore,
  TestCaseVisibility,
} from '@learning/modules/problems/domain/value-objects';
import { DataSource } from 'typeorm';

import { HarnessTypeOrmRepository } from './harness.typeorm-repository';
import { ProblemPersistenceMapper } from './problem.persistence-mapper';
import { ProblemTypeOrmRepository } from './problem.typeorm-repository';
import { TestCasePersistenceMapper } from './test-case.persistence-mapper';
import { TestCaseTypeOrmRepository } from './test-case.typeorm-repository';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';
import { TypeOrmTransactionRunner } from './typeorm-transaction-runner';

jest.setTimeout(60000);

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_NAME = TEST_DATABASE_URL
  ? decodeURIComponent(new URL(TEST_DATABASE_URL).pathname.replace(/^\//, ''))
  : '';

if (TEST_DATABASE_URL && !/(_test|_lrn001)$/.test(TEST_DATABASE_NAME)) {
  throw new Error(
    'TEST_DATABASE_URL must point to a database whose name ends with _test or _lrn001',
  );
}

const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

const OWNER_ID = '00000000-0000-4000-8000-000000000011';
const TEST_NOW = new Date('2026-01-01T00:00:00.000Z');

let slugSequence = 0;
let dataSource: DataSource;
let problemRepository: ProblemTypeOrmRepository;
let testCaseRepository: TestCaseTypeOrmRepository;
let runner: TypeOrmTransactionRunner;
let context: TypeOrmTransactionContext;

describeIntegration('TestCase management integration', () => {
  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: TEST_DATABASE_URL,
      entities: learningEntities,
      migrations: [
        InitialLearningSchema1700000003000,
        Lrn001ProblemManagement1700000004000,
        Lrn002TestCaseManagement1700000007000,
      ],
      synchronize: false,
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    context = new TypeOrmTransactionContext(dataSource);
    runner = new TypeOrmTransactionRunner(dataSource, context);
    problemRepository = new ProblemTypeOrmRepository(context, new ProblemPersistenceMapper());
    testCaseRepository = new TestCaseTypeOrmRepository(context, new TestCasePersistenceMapper());
  });

  beforeEach(async () => {
    await dataSource.query(
      `TRUNCATE "problems", "topics", "tags", "problem_topics", "problem_tags",
        "problem_languages", "starter_codes", "test_cases", "problem_harnesses" RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function createProblem(): Promise<Problem> {
    const problem = Problem.create(
      {
        slug: new Slug(`problem-${slugSequence++}`),
        title: new ProblemTitle('Two Sum'),
        statement: new ProblemStatement('Given an array, return indices.'),
        problemType: 'STANDARD',
        difficulty: 'EASY',
        executionLimits: new ExecutionLimits({ timeLimitMs: 1000, memoryLimitMb: 256 }),
        createdBy: new CreatedBy(OWNER_ID),
      },
      { now: TEST_NOW },
    );

    await runner.run(() => problemRepository.save(problem));
    return problem;
  }

  it('maps HIDDEN and SAMPLE and lists samples without score', async () => {
    const problem = await createProblem();
    const hidden = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('hidden-input'),
      expectedOutput: new ExpectedOutput('hidden-output'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(5),
      displayOrder: new DisplayOrder(2),
    });
    const sample = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('sample-input'),
      expectedOutput: new ExpectedOutput('sample-output'),
      visibility: new TestCaseVisibility('SAMPLE'),
      score: new TestCaseScore(3),
      displayOrder: new DisplayOrder(1),
    });

    await runner.run(async () => {
      await testCaseRepository.add(hidden);
      await testCaseRepository.add(sample);
    });

    const listed = await runner.run(() => testCaseRepository.listByProblem(problem.id.value));
    expect(listed.map((item) => item.visibility.value)).toEqual(['SAMPLE', 'HIDDEN']);

    const samples = await runner.run(() => testCaseRepository.listSamples(problem.id.value));
    expect(samples).toEqual([
      { input: 'sample-input', expectedOutput: 'sample-output', displayOrder: 1 },
    ]);
  });

  it('reads test cases in stable (display_order, id) order', async () => {
    const problem = await createProblem();
    const first = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('first'),
      expectedOutput: new ExpectedOutput('first'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(1),
      displayOrder: new DisplayOrder(0),
    });
    const second = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('second'),
      expectedOutput: new ExpectedOutput('second'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(1),
      displayOrder: new DisplayOrder(1),
    });

    await runner.run(async () => {
      await testCaseRepository.add(second);
      await testCaseRepository.add(first);
    });

    const listed = await runner.run(() => testCaseRepository.listByProblem(problem.id.value));
    expect(listed.map((item) => item.input.value)).toEqual(['first', 'second']);
  });

  it('computes the test suite summary correctly', async () => {
    const problem = await createProblem();
    const hidden = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('abc'),
      expectedOutput: new ExpectedOutput('x'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(5),
      displayOrder: new DisplayOrder(0),
    });
    const sample = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('de'),
      expectedOutput: new ExpectedOutput('yz'),
      visibility: new TestCaseVisibility('SAMPLE'),
      score: new TestCaseScore(3),
      displayOrder: new DisplayOrder(1),
    });

    await runner.run(async () => {
      await testCaseRepository.add(hidden);
      await testCaseRepository.add(sample);
    });

    const summary = await runner.run(() =>
      problemRepository.loadTestSuiteSummary(problem.id.value),
    );
    expect(summary).toMatchObject({
      totalCount: 2,
      hiddenCount: 1,
      totalScore: 8,
      totalBytes: 3 + 1 + 2 + 2,
      harnessLanguages: [],
    });
  });

  it('computes harness bytes and languages for an enabled FUNCTION problem', async () => {
    const problem = Problem.create(
      {
        slug: new Slug(`function-${Date.now()}`),
        title: new ProblemTitle('Function Problem'),
        statement: new ProblemStatement('Statement'),
        problemType: 'FUNCTION',
        difficulty: 'EASY',
        enabledLanguages: [new EnabledLanguage('python')],
        functionContracts: new Map<SupportedLanguage, FunctionContract>([
          [
            'python',
            new FunctionContract({
              functionName: 'solve',
              parameters: [],
              returnType: 'number',
            }),
          ],
        ]),
        executionLimits: new ExecutionLimits({ timeLimitMs: 1000, memoryLimitMb: 256 }),
        createdBy: new CreatedBy(OWNER_ID),
      },
      { now: TEST_NOW },
    );
    await runner.run(() => problemRepository.save(problem));

    const harness = (
      await import('@learning/modules/problems/domain/harness.aggregate')
    ).Harness.create({
      problemId: problem.id,
      language: 'python',
      source: new (await import('@learning/modules/problems/domain/value-objects')).HarnessSource(
        'harness',
      ),
    });
    const harnessRepository = new HarnessTypeOrmRepository(context);
    await runner.run(() => harnessRepository.upsert(harness));

    const summary = await runner.run(() =>
      problemRepository.loadTestSuiteSummary(problem.id.value),
    );
    expect(summary.harnessLanguages).toEqual(['python']);
    expect(summary.totalBytes).toBe('harness'.length);
  });

  it('does not let two concurrent adds exceed 100 test cases', async () => {
    const problem = await createProblem();
    for (let index = 0; index < 99; index += 1) {
      const testCase = TestCase.create({
        problemId: problem.id,
        input: new TestCaseInput(`input-${index}`),
        expectedOutput: new ExpectedOutput(`output-${index}`),
        visibility: new TestCaseVisibility('HIDDEN'),
        score: new TestCaseScore(1),
        displayOrder: new DisplayOrder(index),
      });
      await runner.run(() => testCaseRepository.add(testCase));
    }

    const authorization = new ProblemAuthorizationService();
    const readiness = new TestSuiteReadinessService(
      new PublishValidator(
        new (
          await import('@learning/modules/problems/domain/services/problem-contract.validator')
        ).ProblemContractValidator(),
      ),
    );
    const addUseCase = new AddTestCaseUseCase(
      authorization,
      problemRepository,
      testCaseRepository,
      readiness,
      runner,
    );
    const principal = {
      userId: OWNER_ID,
      roles: ['LECTURER'],
      permissions: ['problem:update'],
    };

    const command = {
      input: new TestCaseInput('concurrent'),
      expectedOutput: new ExpectedOutput('concurrent'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(1),
    };

    const results = await Promise.allSettled([
      addUseCase.execute(principal, problem.id.value, command),
      addUseCase.execute(principal, problem.id.value, command),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const summary = await runner.run(() =>
      problemRepository.loadTestSuiteSummary(problem.id.value),
    );
    expect(summary.totalCount).toBe(100);
  });

  it('does not let two concurrent removes both remove the last hidden test case', async () => {
    const problem = await createProblem();
    const testCase = TestCase.create({
      problemId: problem.id,
      input: new TestCaseInput('hidden'),
      expectedOutput: new ExpectedOutput('hidden'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(1),
      displayOrder: new DisplayOrder(0),
    });
    await runner.run(() => testCaseRepository.add(testCase));

    const authorization = new ProblemAuthorizationService();
    const readiness = new TestSuiteReadinessService(
      new PublishValidator(
        new (
          await import('@learning/modules/problems/domain/services/problem-contract.validator')
        ).ProblemContractValidator(),
      ),
    );
    const removeUseCase = new RemoveTestCaseUseCase(
      authorization,
      problemRepository,
      testCaseRepository,
      readiness,
      runner,
    );
    const principal = {
      userId: OWNER_ID,
      roles: ['LECTURER'],
      permissions: ['problem:update'],
    };

    const results = await Promise.allSettled([
      removeUseCase.execute(principal, problem.id.value, testCase.id.value),
      removeUseCase.execute(principal, problem.id.value, testCase.id.value),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const remaining = await runner.run(() => testCaseRepository.listByProblem(problem.id.value));
    expect(remaining).toHaveLength(0);
  });
});
