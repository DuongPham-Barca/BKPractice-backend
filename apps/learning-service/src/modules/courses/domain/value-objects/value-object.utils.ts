import { DomainValidationError } from '../errors/domain-validation.error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string')
    throw new DomainValidationError(field, `${field} must be a string`);
  return value;
}

export function assertTrimmedNonEmpty(value: unknown, field: string): string {
  const text = assertString(value, field).trim();
  if (text.length === 0) throw new DomainValidationError(field, `${field} must not be empty`);
  return text;
}

export function assertMaxLength(value: string, field: string, max: number): string {
  if (value.length > max)
    throw new DomainValidationError(field, `${field} must be at most ${max} characters`);
  return value;
}

export function assertCanonicalUuid(value: unknown, field: string): string {
  const text = assertString(value, field);
  if (!UUID_PATTERN.test(text))
    throw new DomainValidationError(field, `${field} must be a canonical UUID`);
  return text;
}

export function assertValidDate(value: unknown, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainValidationError(field, `${field} must be a valid date`);
  }
  return value;
}

export function assertUniqueValues(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new DomainValidationError(field, `${field} must be unique`);
  }
}

// Markdown hạn chế như LRN-001-FR-029: từ chối HTML/script thô. Sao chép các mẫu của bộ kiểm LRN-001
// (không import nội bộ module `problems`); frontend vẫn phải làm sạch khi render.
const DANGEROUS_TAG_PATTERN =
  /<\s*\/?\s*(?:script|style|iframe|object|embed|form|input|button|link|meta|base|svg|math)\b/i;
const EVENT_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;
const DANGEROUS_PROTOCOL_PATTERN = /(?:javascript|vbscript)\s*:|data\s*:\s*text\s*\/\s*html/i;

export function assertSafeMarkdown(value: string, field: string): string {
  if (
    DANGEROUS_TAG_PATTERN.test(value) ||
    EVENT_HANDLER_PATTERN.test(value) ||
    DANGEROUS_PROTOCOL_PATTERN.test(value)
  ) {
    throw new DomainValidationError(field, `${field} must not contain raw HTML or scripts`);
  }
  return value;
}
