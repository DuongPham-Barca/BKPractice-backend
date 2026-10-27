import { PROBLEM_TYPES, type ProblemType } from '@app/contracts';
import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  assertEnumValue,
  assertMaxLength,
  assertString,
  assertTrimmedNonEmpty,
} from './value-object.utils';

export type { ProblemType };

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ON_HOLD'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseProblemType(value: string): ProblemType {
  return assertEnumValue(value, PROBLEM_TYPES, 'problemType');
}

export function parseDifficulty(value: string): Difficulty {
  return assertEnumValue(value, DIFFICULTIES, 'difficulty');
}

export function parsePublishStatus(value: string): PublishStatus {
  return assertEnumValue(value, PUBLISH_STATUSES, 'publishStatus');
}

export class Slug {
  readonly value: string;

  constructor(value: string) {
    const slug = assertString(value, 'slug');

    if (slug.length === 0 || slug.length > 220 || !SLUG_PATTERN.test(slug)) {
      throw new DomainValidationError('slug', 'slug must be 1-220 lowercase kebab-case characters');
    }

    this.value = slug;
    Object.freeze(this);
  }
}

export class ProblemTitle {
  readonly value: string;

  constructor(value: string) {
    const title = assertMaxLength(assertTrimmedNonEmpty(value, 'title'), 'title', 200);

    this.value = title;
    Object.freeze(this);
  }
}

export class DeletedMarker {
  private readonly timestamp: Date | null;

  private constructor(timestamp: Date | null) {
    this.timestamp = timestamp === null ? null : new Date(timestamp.getTime());
    Object.freeze(this);
  }

  static none(): DeletedMarker {
    return new DeletedMarker(null);
  }

  static at(date: Date): DeletedMarker {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new DomainValidationError('deletedAt', 'deletedAt must be a valid date');
    }

    return new DeletedMarker(new Date(date.getTime()));
  }

  static from(date: Date | null): DeletedMarker {
    return date === null ? DeletedMarker.none() : DeletedMarker.at(date);
  }

  get deletedAt(): Date | null {
    return this.timestamp === null ? null : new Date(this.timestamp.getTime());
  }

  get isDeleted(): boolean {
    return this.timestamp !== null;
  }
}
