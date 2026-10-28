import { MAX_TEST_CASE_FIELD_BYTES } from './test-case';
import { assertNonBlank, assertUtf8ByteLength } from './value-object.utils';

export class HarnessSource {
  readonly value: string;

  constructor(value: string) {
    this.value = assertUtf8ByteLength(
      assertNonBlank(value, 'source'),
      'source',
      MAX_TEST_CASE_FIELD_BYTES,
    );
    Object.freeze(this);
  }
}
