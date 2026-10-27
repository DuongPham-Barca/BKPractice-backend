import type { SupportedLanguage } from '@app/contracts';
import { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import {
  buildProblem,
  functionContract,
  languages,
  oopContract,
  snapshotOf,
  starterCode,
} from '@learning/modules/problems/domain/testing/problem-test.factory';
import type {
  ExecutionLimits,
  OopContract,
  ProblemStatement,
  ProblemTitle,
  Slug,
} from '@learning/modules/problems/domain/value-objects';
import { TestSuiteSummary } from '@learning/modules/problems/domain/value-objects';

import { ProblemContractValidator } from './problem-contract.validator';
import { PublishValidator } from './publish.validator';

describe('PublishValidator', () => {
  const validator = new PublishValidator(new ProblemContractValidator());

  it('accepts a complete STANDARD problem when the slug is available', () => {
    const readiness = validator.validate(buildProblem({ enabledLanguages: languages('python') }), {
      slugAvailable: true,
    });

    expect(readiness).toEqual({ ready: true, issues: [] });
  });

  it('reports a taken slug', () => {
    const readiness = validator.validate(buildProblem({ enabledLanguages: languages('python') }), {
      slugAvailable: false,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.issues.map((issue) => issue.code)).toEqual(['SLUG_TAKEN']);
  });

  it('reports missing STANDARD input and output specifications', () => {
    const readiness = validator.validate(
      buildProblem({
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
      }),
      { slugAvailable: true },
    );

    expect(readiness.issues.map((issue) => issue.code)).toEqual([
      'STANDARD_IO_REQUIRED',
      'STANDARD_IO_REQUIRED',
    ]);
  });

  it('reports a missing starter code for a FUNCTION problem', () => {
    const readiness = validator.validate(
      buildProblem({
        problemType: 'FUNCTION',
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
        functionContracts: new Map([['python', functionContract()]]),
      }),
      { slugAvailable: true },
    );

    expect(readiness.issues.map((issue) => issue.code)).toEqual(['STARTER_CODE_MISSING']);
  });

  it('reports a missing enabled language only once', () => {
    const readiness = validator.validate(buildProblem({ enabledLanguages: [] }), {
      slugAvailable: true,
    });

    expect(readiness.issues.map((issue) => issue.code)).toEqual(['ENABLED_LANGUAGE_REQUIRED']);
  });

  it('reports a deleted problem', () => {
    const problem = buildProblem({ enabledLanguages: languages('python') });
    problem.publish();
    problem.softDelete();

    const readiness = validator.validate(problem, { slugAvailable: true });

    expect(readiness.ready).toBe(false);
    expect(readiness.issues.map((issue) => issue.code)).toEqual(['PROBLEM_DELETED']);
  });

  it('reports invalid execution limits from a rehydrated aggregate', () => {
    const snapshot = {
      ...snapshotOf(buildProblem({ enabledLanguages: languages('python') })),
      executionLimits: { timeLimitMs: 0, memoryLimitMb: 0 } as ExecutionLimits,
    };

    const readiness = validator.validate(Problem.rehydrate(snapshot), {
      slugAvailable: true,
    });

    expect(readiness.issues.map((issue) => issue.code)).toEqual([
      'EXECUTION_LIMITS_INVALID',
      'EXECUTION_LIMITS_INVALID',
    ]);
  });

  it('reports invalid title, statement, and slug from a rehydrated aggregate', () => {
    const snapshot = {
      ...snapshotOf(buildProblem({ enabledLanguages: languages('python') })),
      title: { value: '   ' } as ProblemTitle,
      statement: { value: '   ' } as ProblemStatement,
      slug: { value: 'Two Sum' } as Slug,
    };

    const readiness = validator.validate(Problem.rehydrate(snapshot), {
      slugAvailable: true,
    });

    expect(readiness.issues.map((issue) => issue.code)).toEqual([
      'TITLE_REQUIRED',
      'STATEMENT_REQUIRED',
      'SLUG_INVALID',
    ]);
  });

  it('requires at least one hidden test case and a positive total score', () => {
    const base = buildProblem({ enabledLanguages: languages('python') });
    const noHidden = Problem.rehydrate({
      ...snapshotOf(base),
      testSuiteSummary: new TestSuiteSummary({
        totalCount: 1,
        hiddenCount: 0,
        totalScore: 10,
        totalBytes: 10,
      }),
    });
    const noScore = Problem.rehydrate({
      ...snapshotOf(base),
      testSuiteSummary: new TestSuiteSummary({
        totalCount: 1,
        hiddenCount: 1,
        totalScore: 0,
        totalBytes: 10,
      }),
    });

    expect(
      validator.validate(noHidden, { slugAvailable: true }).issues.map((issue) => issue.code),
    ).toEqual(['TEST_CASE_HIDDEN_REQUIRED']);
    expect(
      validator.validate(noScore, { slugAvailable: true }).issues.map((issue) => issue.code),
    ).toEqual(['TEST_CASE_SCORE_REQUIRED']);
  });

  it('requires a harness per enabled language for FUNCTION and OOP problems', () => {
    const problem = buildProblem({
      problemType: 'FUNCTION',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python', 'java'),
      starterCodes: [starterCode('python'), starterCode('java')],
      functionContracts: new Map([
        ['python', functionContract()],
        ['java', functionContract()],
      ]),
    });
    const snapshot = {
      ...snapshotOf(problem),
      testSuiteSummary: new TestSuiteSummary({
        totalCount: 1,
        hiddenCount: 1,
        totalScore: 10,
        totalBytes: 10,
        harnessLanguages: ['python'],
      }),
    };
    const readiness = validator.validate(Problem.rehydrate(snapshot), { slugAvailable: true });

    expect(readiness.issues).toEqual([
      {
        code: 'HARNESS_REQUIRED',
        field: 'harnesses.java',
        message: 'A FUNCTION problem requires a harness for java',
      },
    ]);
  });

  it('includes contract issues from a rehydrated aggregate without duplicates', () => {
    const problem = buildProblem({
      problemType: 'FUNCTION',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      functionContracts: new Map([['python', functionContract()]]),
    });
    const snapshot = {
      ...snapshotOf(problem),
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', oopContract()]]),
    };

    const readiness = validator.validate(Problem.rehydrate(snapshot), {
      slugAvailable: true,
    });

    expect(readiness.issues.map((issue) => issue.code)).toEqual(['OOP_CONTRACT_NOT_ALLOWED']);
  });
});
