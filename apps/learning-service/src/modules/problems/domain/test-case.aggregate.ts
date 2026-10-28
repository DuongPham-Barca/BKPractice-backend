import { ProblemId } from '@learning/modules/problems/domain/value-objects';
import {
  DisplayOrder,
  ExpectedOutput,
  TestCaseId,
  TestCaseInput,
  TestCaseScore,
  TestCaseVisibility,
  testCasePayloadBytes,
} from '@learning/modules/problems/domain/value-objects/test-case';

export interface TestCaseCreateProps {
  readonly id?: TestCaseId;
  readonly problemId: ProblemId;
  readonly input: TestCaseInput;
  readonly expectedOutput: ExpectedOutput;
  readonly visibility: TestCaseVisibility;
  readonly score: TestCaseScore;
  readonly displayOrder: DisplayOrder;
}

export interface TestCaseUpdateProps {
  readonly input?: TestCaseInput;
  readonly expectedOutput?: ExpectedOutput;
  readonly visibility?: TestCaseVisibility;
  readonly score?: TestCaseScore;
  readonly displayOrder?: DisplayOrder;
}

export interface TestCaseSnapshot {
  readonly id: string;
  readonly problemId: string;
  readonly input: string;
  readonly expectedOutput: string;
  readonly visibility: string;
  readonly score: number;
  readonly displayOrder: number;
}

export class TestCase {
  private constructor(
    readonly id: TestCaseId,
    readonly problemId: ProblemId,
    private _input: TestCaseInput,
    private _expectedOutput: ExpectedOutput,
    private _visibility: TestCaseVisibility,
    private _score: TestCaseScore,
    private _displayOrder: DisplayOrder,
  ) {}

  static create(props: TestCaseCreateProps): TestCase {
    return new TestCase(
      props.id ?? TestCaseId.generate(),
      props.problemId,
      props.input,
      props.expectedOutput,
      props.visibility,
      props.score,
      props.displayOrder,
    );
  }

  static rehydrate(snapshot: TestCaseSnapshot): TestCase {
    return new TestCase(
      TestCaseId.from(snapshot.id),
      ProblemId.from(snapshot.problemId),
      new TestCaseInput(snapshot.input),
      new ExpectedOutput(snapshot.expectedOutput),
      new TestCaseVisibility(snapshot.visibility),
      new TestCaseScore(snapshot.score),
      new DisplayOrder(snapshot.displayOrder),
    );
  }

  get input(): TestCaseInput {
    return this._input;
  }

  get expectedOutput(): ExpectedOutput {
    return this._expectedOutput;
  }

  get visibility(): TestCaseVisibility {
    return this._visibility;
  }

  get score(): TestCaseScore {
    return this._score;
  }

  get displayOrder(): DisplayOrder {
    return this._displayOrder;
  }

  get payloadBytes(): number {
    return testCasePayloadBytes(this._input, this._expectedOutput);
  }

  update(props: TestCaseUpdateProps): void {
    this._input = props.input ?? this._input;
    this._expectedOutput = props.expectedOutput ?? this._expectedOutput;
    this._visibility = props.visibility ?? this._visibility;
    this._score = props.score ?? this._score;
    this._displayOrder = props.displayOrder ?? this._displayOrder;
  }

  toSnapshot(): TestCaseSnapshot {
    return {
      id: this.id.value,
      problemId: this.problemId.value,
      input: this._input.value,
      expectedOutput: this._expectedOutput.value,
      visibility: this._visibility.value,
      score: this._score.value,
      displayOrder: this._displayOrder.value,
    };
  }
}
