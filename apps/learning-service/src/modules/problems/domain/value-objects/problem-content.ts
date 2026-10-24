import { assertString, assertTrimmedNonEmpty } from './value-object.utils';

export interface VisibleExampleProps {
  readonly input: string;
  readonly output: string;
  readonly explanation?: string | null;
}

export class ProblemStatement {
  readonly value: string;

  constructor(value: string) {
    this.value = assertTrimmedNonEmpty(value, 'statement');
    Object.freeze(this);
  }
}

export class InputSpecification {
  readonly value: string;

  constructor(value: string) {
    this.value = assertTrimmedNonEmpty(value, 'inputSpecification');
    Object.freeze(this);
  }
}

export class OutputSpecification {
  readonly value: string;

  constructor(value: string) {
    this.value = assertTrimmedNonEmpty(value, 'outputSpecification');
    Object.freeze(this);
  }
}

export class VisibleExample {
  readonly input: string;
  readonly output: string;
  readonly explanation: string | null;

  constructor(props: VisibleExampleProps) {
    this.input = assertTrimmedNonEmpty(props.input, 'example.input');
    this.output = assertTrimmedNonEmpty(props.output, 'example.output');

    if (props.explanation === undefined || props.explanation === null) {
      this.explanation = null;
    } else {
      const explanation = assertString(props.explanation, 'example.explanation').trim();
      this.explanation = explanation.length === 0 ? null : explanation;
    }

    Object.freeze(this);
  }
}

export class Constraints {
  readonly value: string;

  constructor(value: string) {
    this.value = assertTrimmedNonEmpty(value, 'constraints');
    Object.freeze(this);
  }
}
