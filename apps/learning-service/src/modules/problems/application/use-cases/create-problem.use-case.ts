import type { ProblemType, SupportedLanguage } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { DuplicateSlugError } from '../../domain/errors/duplicate-slug.error';
import { Problem } from '../../domain/problem.aggregate';
import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import type { ContentFormatValidator } from '../../domain/services/content-format.validator';
import type { PublishValidator } from '../../domain/services/publish.validator';
import { CreatedBy, TagReference, TopicReference } from '../../domain/value-objects';
import type {
  Constraints,
  Difficulty,
  EnabledLanguage,
  ExecutionLimits,
  FunctionContract,
  InputSpecification,
  OopContract,
  OutputSpecification,
  ProblemStatement,
  ProblemTitle,
  Slug,
  StarterCode,
  VisibleExample,
} from '../../domain/value-objects';
import { UnknownReferenceError } from '../errors/unknown-reference.error';
import type { UnknownReference } from '../errors/unknown-reference.error';
import type { TopicTagReader } from '../ports/out/topic-tag-reader.port.out';
import type { TransactionRunner } from '../ports/out/transaction-runner.port.out';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

export interface CreateProblemCommand {
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
  readonly topicIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly enabledLanguages: readonly EnabledLanguage[];
  readonly starterCodes: readonly StarterCode[];
  readonly functionContracts: ReadonlyMap<SupportedLanguage, FunctionContract>;
  readonly oopContracts: ReadonlyMap<SupportedLanguage, OopContract>;
}

@Injectable()
export class CreateProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly topicTagReader: TopicTagReader,
    private readonly repository: ProblemRepository,
    private readonly contentValidator: ContentFormatValidator,
    private readonly publishValidator: PublishValidator,
    private readonly transactionRunner: TransactionRunner,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(command: CreateProblemCommand): Promise<ManagedProblemDetailResult> {
    const principal = await this.authorization.requireCreate();

    const [missingTopicIds, missingTagIds] = await Promise.all([
      this.topicTagReader.findMissingTopicIds(command.topicIds),
      this.topicTagReader.findMissingTagIds(command.tagIds),
    ]);
    const references: UnknownReference[] = [
      ...missingTopicIds.map((id): UnknownReference => ({ kind: 'topic', id })),
      ...missingTagIds.map((id): UnknownReference => ({ kind: 'tag', id })),
    ];

    if (references.length > 0) {
      throw new UnknownReferenceError(references);
    }

    if (!(await this.repository.isSlugAvailable(command.slug.value))) {
      throw new DuplicateSlugError(command.slug.value);
    }

    const problem = Problem.create({
      slug: command.slug,
      title: command.title,
      statement: command.statement,
      inputSpecification: command.inputSpecification,
      outputSpecification: command.outputSpecification,
      problemType: command.problemType,
      difficulty: command.difficulty,
      examples: command.examples,
      constraints: command.constraints,
      executionLimits: command.executionLimits,
      topics: command.topicIds.map((id) => new TopicReference(id)),
      tags: command.tagIds.map((id) => new TagReference(id)),
      enabledLanguages: command.enabledLanguages,
      starterCodes: command.starterCodes,
      functionContracts: command.functionContracts,
      oopContracts: command.oopContracts,
      createdBy: new CreatedBy(principal.userId),
    });

    this.contentValidator.assertSafe(problem);

    await this.transactionRunner.run(() => this.repository.save(problem));

    const readiness = this.publishValidator.validate(problem, { slugAvailable: true });

    return this.resultMapper.toManagedDetail(problem, readiness);
  }
}
