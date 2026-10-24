import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';

import { assertEnumValue, assertIntegerInRange, assertNonBlank } from './value-object.utils';

export const MIN_TIME_LIMIT_MS = 1;
export const MAX_TIME_LIMIT_MS = 10_000;
export const MIN_MEMORY_LIMIT_MB = 1;
export const MAX_MEMORY_LIMIT_MB = 1_024;

export interface StarterCodeProps {
  readonly language: string;
  readonly sourceCode: string;
}

export interface ExecutionLimitsProps {
  readonly timeLimitMs: number;
  readonly memoryLimitMb: number;
}

export function parseSupportedLanguage(value: string): SupportedLanguage {
  return assertEnumValue(value, SUPPORTED_LANGUAGES, 'language');
}

export class EnabledLanguage {
  readonly value: SupportedLanguage;

  constructor(value: string) {
    this.value = parseSupportedLanguage(value);
    Object.freeze(this);
  }
}

export class StarterCode {
  readonly language: SupportedLanguage;
  readonly sourceCode: string;

  constructor(props: StarterCodeProps) {
    this.language = parseSupportedLanguage(props.language);
    this.sourceCode = assertNonBlank(props.sourceCode, 'starterCode.sourceCode');
    Object.freeze(this);
  }
}

export class ExecutionLimits {
  readonly timeLimitMs: number;
  readonly memoryLimitMb: number;

  constructor(props: ExecutionLimitsProps) {
    this.timeLimitMs = assertIntegerInRange(
      props.timeLimitMs,
      'executionLimits.timeLimitMs',
      MIN_TIME_LIMIT_MS,
      MAX_TIME_LIMIT_MS,
    );
    this.memoryLimitMb = assertIntegerInRange(
      props.memoryLimitMb,
      'executionLimits.memoryLimitMb',
      MIN_MEMORY_LIMIT_MB,
      MAX_MEMORY_LIMIT_MB,
    );
    Object.freeze(this);
  }
}
