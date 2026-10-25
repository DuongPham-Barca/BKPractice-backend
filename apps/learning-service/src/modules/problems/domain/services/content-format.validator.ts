import { Injectable } from '@nestjs/common';

import { DomainValidationError } from '../errors/domain-validation.error';
import type { Problem } from '../problem.aggregate';

export const STATEMENT_MAX_LENGTH = 100_000;
export const TEXT_SECTION_MAX_LENGTH = 20_000;
export const EXAMPLE_FIELD_MAX_LENGTH = 20_000;

const DANGEROUS_TAG_PATTERN =
  /<\s*\/?\s*(?:script|style|iframe|object|embed|form|input|button|link|meta|base|svg|math)\b/i;
const EVENT_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;
const DANGEROUS_PROTOCOL_PATTERN = /(?:javascript|vbscript)\s*:|data\s*:\s*text\s*\/\s*html/i;

@Injectable()
export class ContentFormatValidator {
  assertSafe(problem: Problem): void {
    this.assertField(problem.statement.value, 'statement', STATEMENT_MAX_LENGTH);

    if (problem.inputSpecification !== null) {
      this.assertField(
        problem.inputSpecification.value,
        'inputSpecification',
        TEXT_SECTION_MAX_LENGTH,
      );
    }

    if (problem.outputSpecification !== null) {
      this.assertField(
        problem.outputSpecification.value,
        'outputSpecification',
        TEXT_SECTION_MAX_LENGTH,
      );
    }

    problem.examples.forEach((example, index) => {
      this.assertField(example.input, `examples[${index}].input`, EXAMPLE_FIELD_MAX_LENGTH);
      this.assertField(example.output, `examples[${index}].output`, EXAMPLE_FIELD_MAX_LENGTH);

      if (example.explanation !== null) {
        this.assertField(
          example.explanation,
          `examples[${index}].explanation`,
          EXAMPLE_FIELD_MAX_LENGTH,
        );
      }
    });

    if (problem.constraints !== null) {
      this.assertField(problem.constraints.value, 'constraints', TEXT_SECTION_MAX_LENGTH);
    }
  }

  private assertField(value: string, field: string, maxLength: number): void {
    if (value.length > maxLength) {
      throw new DomainValidationError(field, `${field} must be at most ${maxLength} characters`);
    }

    if (
      DANGEROUS_TAG_PATTERN.test(value) ||
      EVENT_HANDLER_PATTERN.test(value) ||
      DANGEROUS_PROTOCOL_PATTERN.test(value)
    ) {
      throw new DomainValidationError(field, `${field} contains unsafe content`);
    }
  }
}
