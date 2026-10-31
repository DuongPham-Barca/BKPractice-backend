import { assertMaxLength, assertString, assertTrimmedNonEmpty } from './value-object.utils';

export class CourseSlug {
  readonly value: string;
  constructor(value: string) {
    const text = assertTrimmedNonEmpty(value, 'slug');
    this.value = assertMaxLength(text, 'slug', 220);
    Object.freeze(this);
  }
}

export class CourseTitle {
  readonly value: string;
  constructor(value: string) {
    const text = assertTrimmedNonEmpty(value, 'title');
    this.value = assertMaxLength(text, 'title', 200);
    Object.freeze(this);
  }
}

export class CourseDescription {
  readonly value: string | null;
  constructor(value: string | null) {
    if (value === null) {
      this.value = null;
      Object.freeze(this);
      return;
    }
    const text = assertString(value, 'description');
    this.value = assertMaxLength(text, 'description', 20000);
    Object.freeze(this);
  }
}

export class ChapterTitle {
  readonly value: string;
  constructor(value: string) {
    const text = assertTrimmedNonEmpty(value, 'chapterTitle');
    this.value = assertMaxLength(text, 'chapterTitle', 200);
    Object.freeze(this);
  }
}

export class ChapterDescription {
  readonly value: string | null;
  constructor(value: string | null) {
    if (value === null) {
      this.value = null;
      Object.freeze(this);
      return;
    }
    const text = assertString(value, 'chapterDescription');
    this.value = assertMaxLength(text, 'chapterDescription', 5000);
    Object.freeze(this);
  }
}
