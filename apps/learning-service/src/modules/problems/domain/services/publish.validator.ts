import type { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import {
  MAX_MEMORY_LIMIT_MB,
  MAX_TIME_LIMIT_MS,
  MIN_MEMORY_LIMIT_MB,
  MIN_TIME_LIMIT_MS,
  TestSuiteSummary,
} from '@learning/modules/problems/domain/value-objects';

import type { ProblemContractValidator } from './problem-contract.validator';
import { type PublishIssue } from './problem-contract.validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PublishFacts {
  readonly slugAvailable: boolean;
}

export interface PublishReadiness {
  readonly ready: boolean;
  readonly issues: readonly PublishIssue[];
}

export class PublishValidator {
  constructor(private readonly contractValidator: ProblemContractValidator) {}

  validate(problem: Problem, facts: PublishFacts): PublishReadiness {
    const issues: PublishIssue[] = [];

    if (problem.isDeleted) {
      issues.push({
        code: 'PROBLEM_DELETED',
        message: 'A deleted problem cannot be published',
      });
    }

    if (problem.title.value.trim().length === 0) {
      issues.push({
        code: 'TITLE_REQUIRED',
        field: 'title',
        message: 'A problem title is required',
      });
    }

    if (problem.statement.value.trim().length === 0) {
      issues.push({
        code: 'STATEMENT_REQUIRED',
        field: 'statement',
        message: 'A problem statement is required',
      });
    }

    if (
      problem.slug.value.length === 0 ||
      problem.slug.value.length > 220 ||
      !SLUG_PATTERN.test(problem.slug.value)
    ) {
      issues.push({
        code: 'SLUG_INVALID',
        field: 'slug',
        message: 'The problem slug is invalid',
      });
    }

    if (!facts.slugAvailable) {
      issues.push({
        code: 'SLUG_TAKEN',
        field: 'slug',
        message: 'The problem slug is already in use',
      });
    }

    if (problem.enabledLanguages.length === 0) {
      issues.push({
        code: 'ENABLED_LANGUAGE_REQUIRED',
        field: 'enabledLanguages',
        message: 'At least one language must be enabled',
      });
    }

    if (!isValidTimeLimit(problem.executionLimits.timeLimitMs)) {
      issues.push({
        code: 'EXECUTION_LIMITS_INVALID',
        field: 'executionLimits.timeLimitMs',
        message: 'The execution time limit is invalid',
      });
    }

    if (!isValidMemoryLimit(problem.executionLimits.memoryLimitMb)) {
      issues.push({
        code: 'EXECUTION_LIMITS_INVALID',
        field: 'executionLimits.memoryLimitMb',
        message: 'The execution memory limit is invalid',
      });
    }

    const testSuite = problem.testSuiteSummary ?? TestSuiteSummary.empty();

    if (testSuite.hiddenCount < 1) {
      issues.push({
        code: 'TEST_CASE_HIDDEN_REQUIRED',
        field: 'testCases',
        message: 'A problem requires at least one hidden test case',
      });
    }

    if (testSuite.totalScore <= 0) {
      issues.push({
        code: 'TEST_CASE_SCORE_REQUIRED',
        field: 'testCases',
        message: 'A problem requires test cases with a positive total score',
      });
    }

    if (problem.problemType !== 'STANDARD') {
      for (const language of problem.enabledLanguages) {
        if (!testSuite.hasHarness(language.value)) {
          issues.push({
            code: 'HARNESS_REQUIRED',
            field: `harnesses.${language.value}`,
            message: `A ${problem.problemType} problem requires a harness for ${language.value}`,
          });
        }
      }
    }

    for (const issue of this.contractValidator.validate(problem)) {
      if (issue.code !== 'ENABLED_LANGUAGE_REQUIRED') {
        issues.push(issue);
      }
    }

    return { ready: issues.length === 0, issues };
  }
}

function isValidTimeLimit(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_TIME_LIMIT_MS && value <= MAX_TIME_LIMIT_MS;
}

function isValidMemoryLimit(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_MEMORY_LIMIT_MB && value <= MAX_MEMORY_LIMIT_MB;
}
