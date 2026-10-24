import { randomUUID } from 'node:crypto';

import { assertCanonicalUuid } from './value-object.utils';

export class ProblemId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static from(value: string): ProblemId {
    return new ProblemId(assertCanonicalUuid(value, 'id'));
  }

  static generate(): ProblemId {
    return ProblemId.from(randomUUID());
  }

  equals(other: ProblemId): boolean {
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

export class TopicReference {
  readonly value: string;

  constructor(value: string) {
    this.value = assertCanonicalUuid(value, 'topicId');
    Object.freeze(this);
  }
}

export class TagReference {
  readonly value: string;

  constructor(value: string) {
    this.value = assertCanonicalUuid(value, 'tagId');
    Object.freeze(this);
  }
}
