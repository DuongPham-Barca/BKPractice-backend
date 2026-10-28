import type { ProblemType, SupportedLanguage } from '@app/contracts';

import { DomainValidationError } from './errors/domain-validation.error';
import { InvalidProblemState } from './errors/invalid-problem-state.error';
import { DeletedMarker, ProblemId } from './value-objects';
import type {
  Constraints,
  CreatedBy,
  Difficulty,
  EnabledLanguage,
  ExecutionLimits,
  FunctionContract,
  InputSpecification,
  OopContract,
  OutputSpecification,
  ProblemStatement,
  ProblemTitle,
  PublishStatus,
  Slug,
  StarterCode,
  TagReference,
  TestSuiteSummary,
  TopicReference,
  VisibleExample,
} from './value-objects';
import { assertUniqueValues, assertValidDate } from './value-objects/value-object.utils';

export interface ProblemSnapshot {
  readonly id: ProblemId;
  readonly slug: Slug;
  readonly title: ProblemTitle;
  readonly statement: ProblemStatement;
  readonly inputSpecification: InputSpecification | null;
  readonly outputSpecification: OutputSpecification | null;
  readonly problemType: ProblemType;
  readonly difficulty: Difficulty;
  readonly examples: readonly VisibleExample[];
  readonly constraints: Constraints | null;
  readonly executionLimits: ExecutionLimits;
  readonly topics: readonly TopicReference[];
  readonly tags: readonly TagReference[];
  readonly enabledLanguages: readonly EnabledLanguage[];
  readonly starterCodes: readonly StarterCode[];
  readonly functionContracts: ReadonlyMap<SupportedLanguage, FunctionContract>;
  readonly oopContracts: ReadonlyMap<SupportedLanguage, OopContract>;
  readonly testSuiteSummary?: TestSuiteSummary | null;
  readonly publishStatus: PublishStatus;
  readonly deletedMarker: DeletedMarker;
  readonly createdBy: CreatedBy;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProblemInput {
  readonly slug: Slug;
  readonly title: ProblemTitle;
  readonly statement: ProblemStatement;
  readonly inputSpecification?: InputSpecification | null;
  readonly outputSpecification?: OutputSpecification | null;
  readonly problemType: ProblemType;
  readonly difficulty: Difficulty;
  readonly examples?: readonly VisibleExample[];
  readonly constraints?: Constraints | null;
  readonly executionLimits: ExecutionLimits;
  readonly topics?: readonly TopicReference[];
  readonly tags?: readonly TagReference[];
  readonly enabledLanguages?: readonly EnabledLanguage[];
  readonly starterCodes?: readonly StarterCode[];
  readonly functionContracts?: ReadonlyMap<SupportedLanguage, FunctionContract>;
  readonly oopContracts?: ReadonlyMap<SupportedLanguage, OopContract>;
  readonly createdBy: CreatedBy;
}

export interface UpdateProblemInput {
  readonly title?: ProblemTitle;
  readonly statement?: ProblemStatement;
  readonly inputSpecification?: InputSpecification | null;
  readonly outputSpecification?: OutputSpecification | null;
  readonly problemType?: ProblemType;
  readonly difficulty?: Difficulty;
  readonly examples?: readonly VisibleExample[];
  readonly constraints?: Constraints | null;
  readonly executionLimits?: ExecutionLimits;
  readonly topics?: readonly TopicReference[];
  readonly tags?: readonly TagReference[];
  readonly enabledLanguages?: readonly EnabledLanguage[];
  readonly starterCodes?: readonly StarterCode[];
  readonly functionContracts?: ReadonlyMap<SupportedLanguage, FunctionContract>;
  readonly oopContracts?: ReadonlyMap<SupportedLanguage, OopContract>;
}

export interface CreateProblemOptions {
  readonly id?: ProblemId;
  readonly now?: Date;
}

export class Problem {
  private readonly _id: ProblemId;
  private readonly _slug: Slug;
  private readonly _createdBy: CreatedBy;
  private readonly _createdAt: Date;

  private _title: ProblemTitle;
  private _statement: ProblemStatement;
  private _inputSpecification: InputSpecification | null;
  private _outputSpecification: OutputSpecification | null;
  private _problemType: ProblemType;
  private _difficulty: Difficulty;
  private _examples: readonly VisibleExample[];
  private _constraints: Constraints | null;
  private _executionLimits: ExecutionLimits;
  private _topics: readonly TopicReference[];
  private _tags: readonly TagReference[];
  private _enabledLanguages: readonly EnabledLanguage[];
  private _starterCodes: readonly StarterCode[];
  private _functionContracts: ReadonlyMap<SupportedLanguage, FunctionContract>;
  private _oopContracts: ReadonlyMap<SupportedLanguage, OopContract>;
  private _testSuiteSummary: TestSuiteSummary | null;
  private _publishStatus: PublishStatus;
  private _deletedMarker: DeletedMarker;
  private _updatedAt: Date;

  private constructor(snapshot: ProblemSnapshot) {
    this._id = snapshot.id;
    this._slug = snapshot.slug;
    this._title = snapshot.title;
    this._statement = snapshot.statement;
    this._inputSpecification = snapshot.inputSpecification;
    this._outputSpecification = snapshot.outputSpecification;
    this._problemType = snapshot.problemType;
    this._difficulty = snapshot.difficulty;
    this._examples = Object.freeze([...snapshot.examples]);
    this._constraints = snapshot.constraints;
    this._executionLimits = snapshot.executionLimits;
    this._topics = Object.freeze([...snapshot.topics]);
    this._tags = Object.freeze([...snapshot.tags]);
    this._enabledLanguages = Object.freeze([...snapshot.enabledLanguages]);
    this._starterCodes = Object.freeze([...snapshot.starterCodes]);
    this._functionContracts = new Map(snapshot.functionContracts);
    this._oopContracts = new Map(snapshot.oopContracts);
    this._testSuiteSummary = snapshot.testSuiteSummary ?? null;
    this._publishStatus = snapshot.publishStatus;
    this._deletedMarker = snapshot.deletedMarker;
    this._createdBy = snapshot.createdBy;
    this._createdAt = assertValidDate(snapshot.createdAt, 'createdAt');
    this._updatedAt = assertValidDate(snapshot.updatedAt, 'updatedAt');
  }

  static create(input: CreateProblemInput, options: CreateProblemOptions = {}): Problem {
    const now = assertValidDate(options.now ?? new Date(), 'now');
    const snapshot: ProblemSnapshot = {
      id: options.id ?? ProblemId.generate(),
      slug: input.slug,
      title: input.title,
      statement: input.statement,
      inputSpecification: input.inputSpecification ?? null,
      outputSpecification: input.outputSpecification ?? null,
      problemType: input.problemType,
      difficulty: input.difficulty,
      examples: input.examples ?? [],
      constraints: input.constraints ?? null,
      executionLimits: input.executionLimits,
      topics: input.topics ?? [],
      tags: input.tags ?? [],
      enabledLanguages: input.enabledLanguages ?? [],
      starterCodes: input.starterCodes ?? [],
      functionContracts: input.functionContracts ?? new Map(),
      oopContracts: input.oopContracts ?? new Map(),
      testSuiteSummary: null,
      publishStatus: 'DRAFT',
      deletedMarker: DeletedMarker.none(),
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    validateConfiguration(snapshot);

    return new Problem(snapshot);
  }

  static rehydrate(snapshot: ProblemSnapshot): Problem {
    return new Problem(snapshot);
  }

  get id(): ProblemId {
    return this._id;
  }

  get slug(): Slug {
    return this._slug;
  }

  get title(): ProblemTitle {
    return this._title;
  }

  get statement(): ProblemStatement {
    return this._statement;
  }

  get inputSpecification(): InputSpecification | null {
    return this._inputSpecification;
  }

  get outputSpecification(): OutputSpecification | null {
    return this._outputSpecification;
  }

  get problemType(): ProblemType {
    return this._problemType;
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get examples(): readonly VisibleExample[] {
    return Object.freeze([...this._examples]);
  }

  get constraints(): Constraints | null {
    return this._constraints;
  }

  get executionLimits(): ExecutionLimits {
    return this._executionLimits;
  }

  get topics(): readonly TopicReference[] {
    return Object.freeze([...this._topics]);
  }

  get tags(): readonly TagReference[] {
    return Object.freeze([...this._tags]);
  }

  get enabledLanguages(): readonly EnabledLanguage[] {
    return Object.freeze([...this._enabledLanguages]);
  }

  get starterCodes(): readonly StarterCode[] {
    return Object.freeze([...this._starterCodes]);
  }

  get functionContracts(): ReadonlyMap<SupportedLanguage, FunctionContract> {
    return new Map(this._functionContracts);
  }

  get oopContracts(): ReadonlyMap<SupportedLanguage, OopContract> {
    return new Map(this._oopContracts);
  }

  get testSuiteSummary(): TestSuiteSummary | null {
    return this._testSuiteSummary;
  }

  get publishStatus(): PublishStatus {
    return this._publishStatus;
  }

  get createdBy(): CreatedBy {
    return this._createdBy;
  }

  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  get deletedAt(): Date | null {
    return this._deletedMarker.deletedAt;
  }

  get isDeleted(): boolean {
    return this._deletedMarker.isDeleted;
  }

  get isDraft(): boolean {
    return this._publishStatus === 'DRAFT';
  }

  get isPublished(): boolean {
    return this._publishStatus === 'PUBLISHED';
  }

  get isOnHold(): boolean {
    return this._publishStatus === 'ON_HOLD';
  }

  attachTestSuiteSummary(summary: TestSuiteSummary): void {
    this._testSuiteSummary = summary;
  }

  assertCanManageTestCases(): void {
    if (this.isDeleted) {
      throw new InvalidProblemState('deleted', 'A deleted problem cannot manage test cases');
    }

    if (this.isOnHold) {
      throw new InvalidProblemState('publishStatus', 'A problem on hold cannot manage test cases');
    }
  }

  assertCanManageHarnesses(): void {
    if (this.isDeleted) {
      throw new InvalidProblemState('deleted', 'A deleted problem cannot manage harnesses');
    }

    if (this.isOnHold) {
      throw new InvalidProblemState('publishStatus', 'A problem on hold cannot manage harnesses');
    }

    if (this.problemType === 'STANDARD') {
      throw new DomainValidationError('problemType', 'A STANDARD problem cannot have a harness');
    }
  }

  hasEnabledLanguage(language: SupportedLanguage): boolean {
    return this._enabledLanguages.some((item) => item.value === language);
  }

  update(input: UpdateProblemInput, now: Date = new Date()): void {
    if (this.isDeleted) {
      throw new InvalidProblemState('deleted', 'A deleted problem cannot be updated');
    }

    if (this.isOnHold) {
      throw new InvalidProblemState('publishStatus', 'A problem on hold cannot be updated');
    }

    if (
      input.problemType !== undefined &&
      input.problemType !== this._problemType &&
      !this.isDraft
    ) {
      throw new InvalidProblemState(
        'problemType',
        'The problem type can only be changed while the problem is a draft',
      );
    }

    const updatedAt = assertValidDate(now, 'now');
    const candidate: ProblemSnapshot = {
      id: this._id,
      slug: this._slug,
      title: input.title ?? this._title,
      statement: input.statement ?? this._statement,
      inputSpecification: valueOr(input.inputSpecification, this._inputSpecification),
      outputSpecification: valueOr(input.outputSpecification, this._outputSpecification),
      problemType: input.problemType ?? this._problemType,
      difficulty: input.difficulty ?? this._difficulty,
      examples: input.examples ?? this._examples,
      constraints: valueOr(input.constraints, this._constraints),
      executionLimits: input.executionLimits ?? this._executionLimits,
      topics: input.topics ?? this._topics,
      tags: input.tags ?? this._tags,
      enabledLanguages: input.enabledLanguages ?? this._enabledLanguages,
      starterCodes: input.starterCodes ?? this._starterCodes,
      functionContracts: input.functionContracts ?? this._functionContracts,
      oopContracts: input.oopContracts ?? this._oopContracts,
      testSuiteSummary: this._testSuiteSummary,
      publishStatus: this._publishStatus,
      deletedMarker: this._deletedMarker,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt,
    };

    validateConfiguration(candidate);

    this._title = candidate.title;
    this._statement = candidate.statement;
    this._inputSpecification = candidate.inputSpecification;
    this._outputSpecification = candidate.outputSpecification;
    this._problemType = candidate.problemType;
    this._difficulty = candidate.difficulty;
    this._examples = Object.freeze([...candidate.examples]);
    this._constraints = candidate.constraints;
    this._executionLimits = candidate.executionLimits;
    this._topics = Object.freeze([...candidate.topics]);
    this._tags = Object.freeze([...candidate.tags]);
    this._enabledLanguages = Object.freeze([...candidate.enabledLanguages]);
    this._starterCodes = Object.freeze([...candidate.starterCodes]);
    this._functionContracts = new Map(candidate.functionContracts);
    this._oopContracts = new Map(candidate.oopContracts);
    this._testSuiteSummary = candidate.testSuiteSummary ?? null;
    this._updatedAt = updatedAt;
  }

  publish(now: Date = new Date()): void {
    this.assertCanTransition('publish', 'DRAFT');
    const updatedAt = assertValidDate(now, 'now');
    this._publishStatus = 'PUBLISHED';
    this._updatedAt = updatedAt;
  }

  hold(now: Date = new Date()): void {
    this.assertCanTransition('hold', 'PUBLISHED');
    const updatedAt = assertValidDate(now, 'now');
    this._publishStatus = 'ON_HOLD';
    this._updatedAt = updatedAt;
  }

  republish(now: Date = new Date()): void {
    this.assertCanTransition('republish', 'ON_HOLD');
    const updatedAt = assertValidDate(now, 'now');
    this._publishStatus = 'PUBLISHED';
    this._updatedAt = updatedAt;
  }

  softDelete(now: Date = new Date()): void {
    if (this.isDeleted) {
      throw new InvalidProblemState('deleted', 'The problem is already deleted');
    }

    if (!this.isPublished && !this.isOnHold) {
      throw new InvalidProblemState(
        'publishStatus',
        'Only a published or on-hold problem can be deleted',
      );
    }

    const deletedAt = assertValidDate(now, 'now');
    this._deletedMarker = DeletedMarker.at(deletedAt);
    this._updatedAt = deletedAt;
  }

  restore(now: Date = new Date()): void {
    if (!this.isDeleted) {
      throw new InvalidProblemState('deleted', 'The problem is not deleted');
    }

    const updatedAt = assertValidDate(now, 'now');
    this._deletedMarker = DeletedMarker.none();
    this._updatedAt = updatedAt;
  }

  private assertCanTransition(action: string, requiredStatus: PublishStatus): void {
    if (this.isDeleted) {
      throw new InvalidProblemState('deleted', `A deleted problem cannot ${action}`);
    }

    if (this._publishStatus !== requiredStatus) {
      throw new InvalidProblemState(
        'publishStatus',
        `Cannot ${action} a problem with status ${this._publishStatus}`,
      );
    }
  }
}

function valueOr<T>(next: T | undefined, current: T): T {
  return next === undefined ? current : next;
}

function validateConfiguration(snapshot: ProblemSnapshot): void {
  const topicIds = snapshot.topics.map((topic) => topic.value);
  const tagIds = snapshot.tags.map((tag) => tag.value);
  const languageValues = snapshot.enabledLanguages.map((language) => language.value);
  const starterLanguages = snapshot.starterCodes.map((starterCode) => starterCode.language);
  const enabledLanguages = new Set(languageValues);

  assertUniqueValues(topicIds, 'topics');
  assertUniqueValues(tagIds, 'tags');
  assertUniqueValues(languageValues, 'enabledLanguages');
  assertUniqueValues(starterLanguages, 'starterCodes.language');

  for (const starterCode of snapshot.starterCodes) {
    if (!enabledLanguages.has(starterCode.language)) {
      throw new DomainValidationError(
        'starterCodes.language',
        `starter code language ${starterCode.language} is not enabled`,
      );
    }
  }

  for (const language of snapshot.functionContracts.keys()) {
    if (!enabledLanguages.has(language)) {
      throw new DomainValidationError(
        'functionContracts',
        `function contract language ${language} is not enabled`,
      );
    }
  }

  for (const language of snapshot.oopContracts.keys()) {
    if (!enabledLanguages.has(language)) {
      throw new DomainValidationError(
        'oopContracts',
        `oop contract language ${language} is not enabled`,
      );
    }
  }

  if (snapshot.problemType === 'STANDARD') {
    if (snapshot.functionContracts.size > 0 || snapshot.oopContracts.size > 0) {
      throw new DomainValidationError(
        'problemType',
        'a STANDARD problem must not have function or oop contracts',
      );
    }
    return;
  }

  if (snapshot.problemType === 'FUNCTION') {
    if (snapshot.oopContracts.size > 0) {
      throw new DomainValidationError(
        'problemType',
        'a FUNCTION problem must not have oop contracts',
      );
    }
    return;
  }

  if (snapshot.functionContracts.size > 0) {
    throw new DomainValidationError(
      'problemType',
      'an OOP problem must not have function contracts',
    );
  }
}
