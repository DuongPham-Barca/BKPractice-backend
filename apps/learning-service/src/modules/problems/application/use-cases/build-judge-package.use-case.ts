import { SUPPORTED_LANGUAGES, type JudgeTestCase, type SupportedLanguage } from '@app/contracts';
import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import type { IBuildJudgePackagePortIn } from '@learning/modules/problems/application/ports/in/build-judge-package.port.in';
import type { JudgePackageResult } from '@learning/modules/problems/application/results/test-case.results';
import { InvalidProblemState } from '@learning/modules/problems/domain/errors/invalid-problem-state.error';
import type { HarnessRepository } from '@learning/modules/problems/domain/repositories/harness.repository.port.out';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import type { TestCaseRepository } from '@learning/modules/problems/domain/repositories/test-case.repository.port.out';
import { assertEnumValue } from '@learning/modules/problems/domain/value-objects/value-object.utils';
import {
  HARNESS_REPOSITORY,
  PROBLEM_REPOSITORY,
  TEST_CASE_REPOSITORY,
} from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class BuildJudgePackageUseCase implements IBuildJudgePackagePortIn {
  constructor(
    @Inject(PROBLEM_REPOSITORY)
    private readonly problemRepository: ProblemRepository,
    @Inject(TEST_CASE_REPOSITORY)
    private readonly testCaseRepository: TestCaseRepository,
    @Inject(HARNESS_REPOSITORY)
    private readonly harnessRepository: HarnessRepository,
  ) {}

  async execute(problemId: string, language: SupportedLanguage): Promise<JudgePackageResult> {
    const requestedLanguage = assertEnumValue(language, SUPPORTED_LANGUAGES, 'language');
    const problem = await this.problemRepository.findById(problemId);

    if (problem === null || !problem.isPublished) {
      throw new ProblemNotFoundError(problemId);
    }

    if (!problem.enabledLanguages.some((item) => item.value === requestedLanguage)) {
      throw new ProblemNotFoundError(problemId);
    }

    const [testCases, harness] = await Promise.all([
      this.testCaseRepository.listForJudge(problemId),
      problem.problemType === 'STANDARD'
        ? Promise.resolve(null)
        : this.harnessRepository.find(problemId, requestedLanguage),
    ]);

    if (problem.problemType !== 'STANDARD' && harness === null) {
      throw new InvalidProblemState(
        'harness',
        `A ${problem.problemType} problem requires a harness for ${requestedLanguage}`,
      );
    }

    return {
      problemId: problem.id.value,
      problemType: problem.problemType,
      timeLimitMs: problem.executionLimits.timeLimitMs,
      memoryLimitMb: problem.executionLimits.memoryLimitMb,
      ...(harness === null ? {} : { hiddenHarness: harness.source.value }),
      testCases: testCases.map((testCase): JudgeTestCase => ({
        id: testCase.id.value,
        stdin: testCase.input.value,
        expectedOutput: testCase.expectedOutput.value,
        score: testCase.score.value,
      })),
    };
  }
}
