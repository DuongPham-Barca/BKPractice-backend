import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';
import { ProblemId } from '@learning/modules/problems/domain/value-objects';
import { HarnessSource } from '@learning/modules/problems/domain/value-objects/harness';
import {
  assertEnumValue,
  utf8ByteLength,
} from '@learning/modules/problems/domain/value-objects/value-object.utils';

export interface HarnessCreateProps {
  readonly problemId: ProblemId;
  readonly language: SupportedLanguage;
  readonly source: HarnessSource;
}

export interface HarnessSnapshot {
  readonly problemId: string;
  readonly language: string;
  readonly source: string;
}

export class Harness {
  private constructor(
    readonly problemId: ProblemId,
    readonly language: SupportedLanguage,
    readonly source: HarnessSource,
  ) {}

  static create(props: HarnessCreateProps): Harness {
    return new Harness(props.problemId, props.language, props.source);
  }

  static rehydrate(snapshot: HarnessSnapshot): Harness {
    return new Harness(
      ProblemId.from(snapshot.problemId),
      assertEnumValue(snapshot.language, SUPPORTED_LANGUAGES, 'language'),
      new HarnessSource(snapshot.source),
    );
  }

  get sourceBytes(): number {
    return utf8ByteLength(this.source.value);
  }

  toSnapshot(): HarnessSnapshot {
    return {
      problemId: this.problemId.value,
      language: this.language,
      source: this.source.value,
    };
  }
}
