import { randomUUID } from 'node:crypto';

import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  assertCanonicalUuid,
  assertEnumValue,
  assertIntegerInRange,
  assertString,
  assertUtf8ByteLength,
  utf8ByteLength,
} from './value-object.utils';

export const MAX_TEST_CASE_FIELD_BYTES = 1_048_576;
export const MAX_TEST_CASES = 100;
export const MAX_TEST_SUITE_BYTES = 8_388_608;

export const TEST_CASE_VISIBILITIES = ['HIDDEN', 'SAMPLE'] as const;
export type TestCaseVisibilityValue = (typeof TEST_CASE_VISIBILITIES)[number];

export class TestCaseId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static from(value: string): TestCaseId {
    return new TestCaseId(assertCanonicalUuid(value, 'testCaseId'));
  }

  static generate(): TestCaseId {
    return TestCaseId.from(randomUUID());
  }

  equals(other: TestCaseId): boolean {
    return this.value === other.value;
  }
}

export class TestCaseInput {
  readonly value: string;

  constructor(value: string) {
    this.value = assertUtf8ByteLength(
      assertString(value, 'input'),
      'input',
      MAX_TEST_CASE_FIELD_BYTES,
    );
    Object.freeze(this);
  }
}

export class ExpectedOutput {
  readonly value: string;

  constructor(value: string) {
    this.value = assertUtf8ByteLength(
      assertString(value, 'expectedOutput'),
      'expectedOutput',
      MAX_TEST_CASE_FIELD_BYTES,
    );
    Object.freeze(this);
  }
}

export class TestCaseVisibility {
  readonly value: TestCaseVisibilityValue;

  constructor(value: string) {
    this.value = assertEnumValue(value, TEST_CASE_VISIBILITIES, 'visibility');
    Object.freeze(this);
  }

  static hidden(): TestCaseVisibility {
    return new TestCaseVisibility('HIDDEN');
  }

  get isHidden(): boolean {
    return this.value === 'HIDDEN';
  }
}

export class TestCaseScore {
  readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new DomainValidationError('score', 'score must be a non-negative integer');
    }

    this.value = value;
    Object.freeze(this);
  }
}

export class DisplayOrder {
  readonly value: number;

  constructor(value: number) {
    this.value = assertIntegerInRange(value, 'displayOrder', 0, Number.MAX_SAFE_INTEGER);
    Object.freeze(this);
  }
}

export function testCasePayloadBytes(input: TestCaseInput, expectedOutput: ExpectedOutput): number {
  return utf8ByteLength(input.value) + utf8ByteLength(expectedOutput.value);
}
