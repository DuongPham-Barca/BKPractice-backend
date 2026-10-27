import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  ExpectedOutput,
  MAX_TEST_CASE_FIELD_BYTES,
  MAX_TEST_CASES,
  MAX_TEST_SUITE_BYTES,
  TestCaseInput,
  TestCaseScore,
  TestCaseVisibility,
  TestSuiteSummary,
} from './index';

describe('test case value objects', () => {
  it('accepts exactly 1 MiB of UTF-8 content and rejects one byte more', () => {
    const boundary = 'é'.repeat(MAX_TEST_CASE_FIELD_BYTES / 2);

    expect(() => new TestCaseInput(boundary)).not.toThrow();
    expect(() => new ExpectedOutput(boundary)).not.toThrow();
    expect(() => new TestCaseInput(`${boundary}a`)).toThrow(DomainValidationError);
    expect(() => new ExpectedOutput(`${boundary}a`)).toThrow(DomainValidationError);
  });

  it('validates visibility, score, and display order', () => {
    expect(new TestCaseVisibility('HIDDEN').isHidden).toBe(true);
    expect(new TestCaseVisibility('SAMPLE').isHidden).toBe(false);
    expect(TestCaseVisibility.hidden().value).toBe('HIDDEN');
    expect(new TestCaseScore(0).value).toBe(0);

    expect(() => new TestCaseVisibility('PUBLIC')).toThrow(DomainValidationError);
    expect(() => new TestCaseScore(-1)).toThrow(DomainValidationError);
    expect(() => new TestCaseScore(1.5)).toThrow(DomainValidationError);
  });
});

describe('TestSuiteSummary', () => {
  const hidden = new TestCaseVisibility('HIDDEN');
  const sample = new TestCaseVisibility('SAMPLE');

  it('starts empty and tracks test case deltas', () => {
    const empty = TestSuiteSummary.empty();
    const added = empty.withTestCaseAdded({
      input: new TestCaseInput('1 2'),
      expectedOutput: new ExpectedOutput('3'),
      visibility: hidden,
      score: new TestCaseScore(10),
    });

    expect(added.totalCount).toBe(1);
    expect(added.hiddenCount).toBe(1);
    expect(added.totalScore).toBe(10);
    expect(added.totalBytes).toBe(4);

    const sampled = added.withTestCaseAdded({
      input: new TestCaseInput('2 3'),
      expectedOutput: new ExpectedOutput('5'),
      visibility: sample,
      score: new TestCaseScore(5),
    });

    expect(sampled.totalCount).toBe(2);
    expect(sampled.hiddenCount).toBe(1);
    expect(sampled.totalScore).toBe(15);

    const updated = sampled.withTestCaseUpdated(
      { visibility: hidden, score: new TestCaseScore(10), bytes: 4 },
      {
        input: new TestCaseInput('10 20'),
        expectedOutput: new ExpectedOutput('30'),
        visibility: sample,
        score: new TestCaseScore(20),
      },
    );

    expect(updated.hiddenCount).toBe(0);
    expect(updated.totalScore).toBe(25);

    const removed = updated.withTestCaseRemoved({
      visibility: sample,
      score: new TestCaseScore(5),
      bytes: 4,
    });

    expect(removed.totalCount).toBe(1);
    expect(removed.totalScore).toBe(20);
  });

  it('tracks harness presence and bytes', () => {
    const summary = TestSuiteSummary.empty().withHarnessSet('python', null, 12);

    expect(summary.harnessLanguages).toEqual(['python']);
    expect(summary.totalBytes).toBe(12);
    expect(summary.hasHarness('python')).toBe(true);

    const replaced = summary.withHarnessSet('python', 12, 20);

    expect(replaced.totalBytes).toBe(20);

    const removed = replaced.withHarnessRemoved('python', 20);

    expect(removed.harnessLanguages).toEqual([]);
    expect(removed.totalBytes).toBe(0);
  });

  it('rejects an inconsistent harness delta', () => {
    expect(() => TestSuiteSummary.empty().withHarnessSet('python', 10, 20)).toThrow(
      DomainValidationError,
    );

    const summary = TestSuiteSummary.empty().withHarnessSet('python', null, 10);

    expect(() => summary.withHarnessSet('python', null, 20)).toThrow(DomainValidationError);
    expect(() => summary.withHarnessRemoved('java', 10)).toThrow(DomainValidationError);
  });

  it('enforces the suite limits', () => {
    expect(
      () =>
        new TestSuiteSummary({
          totalCount: MAX_TEST_CASES + 1,
          hiddenCount: 0,
          totalScore: 0,
          totalBytes: 0,
        }),
    ).toThrow(DomainValidationError);

    expect(
      () =>
        new TestSuiteSummary({
          totalCount: 1,
          hiddenCount: 1,
          totalScore: 1,
          totalBytes: MAX_TEST_SUITE_BYTES + 1,
        }),
    ).toThrow(DomainValidationError);
  });
});
