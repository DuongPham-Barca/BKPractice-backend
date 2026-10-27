import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';
import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  MAX_TEST_CASES,
  MAX_TEST_SUITE_BYTES,
  type ExpectedOutput,
  type TestCaseInput,
  type TestCaseScore,
  type TestCaseVisibility,
  testCasePayloadBytes,
} from './test-case';
import { assertEnumValue, assertIntegerInRange } from './value-object.utils';

export interface TestSuiteSummaryProps {
  readonly totalCount: number;
  readonly hiddenCount: number;
  readonly totalScore: number;
  readonly totalBytes: number;
  readonly harnessLanguages?: readonly SupportedLanguage[];
}

interface TestCaseContribution {
  readonly input: TestCaseInput;
  readonly expectedOutput: ExpectedOutput;
  readonly visibility: TestCaseVisibility;
  readonly score: TestCaseScore;
}

interface TestCaseDelta {
  readonly visibility: TestCaseVisibility;
  readonly score: TestCaseScore;
  readonly bytes: number;
}

export class TestSuiteSummary {
  readonly totalCount: number;
  readonly hiddenCount: number;
  readonly totalScore: number;
  readonly totalBytes: number;
  readonly harnessLanguages: readonly SupportedLanguage[];

  constructor(props: TestSuiteSummaryProps) {
    this.totalCount = assertIntegerInRange(
      props.totalCount,
      'testSuite.totalCount',
      0,
      MAX_TEST_CASES,
    );
    this.hiddenCount = assertIntegerInRange(
      props.hiddenCount,
      'testSuite.hiddenCount',
      0,
      this.totalCount,
    );
    this.totalScore = assertIntegerInRange(
      props.totalScore,
      'testSuite.totalScore',
      0,
      Number.MAX_SAFE_INTEGER,
    );
    this.totalBytes = assertIntegerInRange(
      props.totalBytes,
      'testSuite.totalBytes',
      0,
      MAX_TEST_SUITE_BYTES,
    );
    this.harnessLanguages = Object.freeze(
      [...new Set(props.harnessLanguages ?? [])]
        .map((language) => assertEnumValue(language, SUPPORTED_LANGUAGES, 'harnessLanguage'))
        .sort(),
    );
    Object.freeze(this);
  }

  static empty(): TestSuiteSummary {
    return new TestSuiteSummary({
      totalCount: 0,
      hiddenCount: 0,
      totalScore: 0,
      totalBytes: 0,
      harnessLanguages: [],
    });
  }

  hasHarness(language: SupportedLanguage): boolean {
    return this.harnessLanguages.includes(language);
  }

  withTestCaseAdded(contribution: TestCaseContribution): TestSuiteSummary {
    return new TestSuiteSummary({
      totalCount: this.totalCount + 1,
      hiddenCount: this.hiddenCount + (contribution.visibility.isHidden ? 1 : 0),
      totalScore: this.totalScore + contribution.score.value,
      totalBytes:
        this.totalBytes + testCasePayloadBytes(contribution.input, contribution.expectedOutput),
      harnessLanguages: this.harnessLanguages,
    });
  }

  withTestCaseUpdated(previous: TestCaseDelta, next: TestCaseContribution): TestSuiteSummary {
    return new TestSuiteSummary({
      totalCount: this.totalCount,
      hiddenCount:
        this.hiddenCount -
        (previous.visibility.isHidden ? 1 : 0) +
        (next.visibility.isHidden ? 1 : 0),
      totalScore: this.totalScore - previous.score.value + next.score.value,
      totalBytes:
        this.totalBytes - previous.bytes + testCasePayloadBytes(next.input, next.expectedOutput),
      harnessLanguages: this.harnessLanguages,
    });
  }

  withTestCaseRemoved(removed: TestCaseDelta): TestSuiteSummary {
    return new TestSuiteSummary({
      totalCount: this.totalCount - 1,
      hiddenCount: this.hiddenCount - (removed.visibility.isHidden ? 1 : 0),
      totalScore: this.totalScore - removed.score.value,
      totalBytes: this.totalBytes - removed.bytes,
      harnessLanguages: this.harnessLanguages,
    });
  }

  withHarnessSet(
    language: SupportedLanguage,
    previousBytes: number | null,
    nextBytes: number,
  ): TestSuiteSummary {
    const wasPresent = this.hasHarness(language);

    if ((wasPresent && previousBytes === null) || (!wasPresent && previousBytes !== null)) {
      throw new DomainValidationError(
        'testSuite.harnessLanguages',
        'Harness summary is inconsistent with the stored harness',
      );
    }

    const harnessLanguages = wasPresent
      ? this.harnessLanguages
      : [...this.harnessLanguages, language];

    return new TestSuiteSummary({
      totalCount: this.totalCount,
      hiddenCount: this.hiddenCount,
      totalScore: this.totalScore,
      totalBytes: this.totalBytes - (previousBytes ?? 0) + nextBytes,
      harnessLanguages,
    });
  }

  withHarnessRemoved(language: SupportedLanguage, bytes: number): TestSuiteSummary {
    if (!this.hasHarness(language)) {
      throw new DomainValidationError(
        'testSuite.harnessLanguages',
        'Harness summary is inconsistent with the stored harness',
      );
    }

    return new TestSuiteSummary({
      totalCount: this.totalCount,
      hiddenCount: this.hiddenCount,
      totalScore: this.totalScore,
      totalBytes: this.totalBytes - bytes,
      harnessLanguages: this.harnessLanguages.filter((item) => item !== language),
    });
  }

  assertWithinLimits(): void {
    if (this.totalBytes > MAX_TEST_SUITE_BYTES) {
      throw new DomainValidationError(
        'testSuite.totalBytes',
        `testSuite.totalBytes must be at most ${MAX_TEST_SUITE_BYTES}`,
      );
    }
  }
}
