import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new DomainValidationError(field, `${field} must be a string`);
  }

  return value;
}

export function assertTrimmedNonEmpty(value: unknown, field: string): string {
  const text = assertString(value, field).trim();

  if (text.length === 0) {
    throw new DomainValidationError(field, `${field} must not be empty`);
  }

  return text;
}

export function assertNonBlank(value: unknown, field: string): string {
  const text = assertString(value, field);

  if (text.trim().length === 0) {
    throw new DomainValidationError(field, `${field} must not be blank`);
  }

  return text;
}

export function assertMaxLength(value: string, field: string, max: number): string {
  if (value.length > max) {
    throw new DomainValidationError(field, `${field} must be at most ${max} characters`);
  }

  return value;
}

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

export function assertUtf8ByteLength(value: string, field: string, max: number): string {
  if (utf8ByteLength(value) > max) {
    throw new DomainValidationError(field, `${field} must be at most ${max} UTF-8 bytes`);
  }

  return value;
}

export function assertCanonicalUuid(value: unknown, field: string): string {
  const text = assertString(value, field);

  if (!UUID_PATTERN.test(text)) {
    throw new DomainValidationError(field, `${field} must be a canonical UUID`);
  }

  return text;
}

export function assertIntegerInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new DomainValidationError(field, `${field} must be an integer between ${min} and ${max}`);
  }

  return value;
}

export function assertValidDate(value: unknown, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainValidationError(field, `${field} must be a valid date`);
  }

  return new Date(value.getTime());
}

export function assertArray(value: unknown, field: string): void {
  if (!Array.isArray(value)) {
    throw new DomainValidationError(field, `${field} must be an array`);
  }
}

export function assertUniqueValues(values: readonly string[], field: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new DomainValidationError(field, `${field} must not contain duplicates`);
    }

    seen.add(value);
  }
}

export function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

export function assertEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  const text = assertString(value, field);

  if (!(allowed as readonly string[]).includes(text)) {
    throw new DomainValidationError(field, `${field} must be one of: ${allowed.join(', ')}`);
  }

  return text as T;
}
