import { randomUUID } from 'node:crypto';

import { assertCanonicalUuid } from './value-object.utils';

export class CourseId {
  readonly value: string;
  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }
  static from(value: string): CourseId {
    return new CourseId(assertCanonicalUuid(value, 'id'));
  }
  static generate(): CourseId {
    return CourseId.from(randomUUID());
  }
  equals(other: CourseId): boolean {
    return this.value === other.value;
  }
}

export class ChapterId {
  readonly value: string;
  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }
  static from(value: string): ChapterId {
    return new ChapterId(assertCanonicalUuid(value, 'chapterId'));
  }
  static generate(): ChapterId {
    return ChapterId.from(randomUUID());
  }
  equals(other: ChapterId): boolean {
    return this.value === other.value;
  }
}

export class CreatedBy {
  readonly value: string;
  constructor(value: string) {
    this.value = assertCanonicalUuid(value, 'createdBy');
    Object.freeze(this);
  }
}

export class ProblemReference {
  readonly value: string;
  constructor(value: string) {
    this.value = assertCanonicalUuid(value, 'problemId');
    Object.freeze(this);
  }
}
