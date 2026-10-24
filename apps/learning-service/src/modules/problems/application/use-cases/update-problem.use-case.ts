import type { ProblemType, SupportedLanguage } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { InvalidProblemState } from '../../domain/errors/invalid-problem-state.error';
import type { UpdateProblemInput } from '../../domain/problem.aggregate';
import type { ProblemRepository } from '../../domain/repositories/problem.repository.port.out';
import type { ContentFormatValidator } from '../../domain/services/content-format.validator';
import type { PublishValidator } from '../../domain/services/publish.validator';
import { TagReference, TopicReference } from '../../domain/value-objects';
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
  StarterCode,
  VisibleExample,
} from '../../domain/value-objects';
import { ProblemNotFoundError } from '../errors/problem-not-found.error';
import { PublishNotReadyError } from '../errors/publish-not-ready.error';
import { UnknownReferenceError } from '../errors/unknown-reference.error';
import type { UnknownReference } from '../errors/unknown-reference.error';
import type { TopicTagReader } from '../ports/out/topic-tag-reader.port.out';
import type { TransactionRunner } from '../ports/out/transaction-runner.port.out';
import type { ProblemResultMapper } from '../results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '../results/problem.results';
import type { ProblemAuthorizationService } from '../services/problem-authorization.service';

export interface UpdateProblemCommand {
  readonly title?: ProblemTitle;
  readonly statement?: ProblemStatement;
  readonly inputSpecification?: InputSpecification | null;
  readonly outputSpecification?: OutputSpecification | null;
  readonly problemType?: ProblemType;
  readonly difficulty?: Difficulty;
  readonly examples?: readonly VisibleExample[];
  readonly constraints?: Constraints | null;
  readonly executionLimits?: ExecutionLimits;
  readonly topicIds?: readonly string[];
  readonly tagIds?: readonly string[];
  readonly enabledLanguages?: readonly EnabledLanguage[];
  readonly starterCodes?: readonly StarterCode[];
  readonly functionContracts?: ReadonlyMap<SupportedLanguage, FunctionContract>;
  readonly oopContracts?: ReadonlyMap<SupportedLanguage, OopContract>;
}

@Injectable()
export class UpdateProblemUseCase {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    private readonly topicTagReader: TopicTagReader,
    private readonly repository: ProblemRepository,
    private readonly contentValidator: ContentFormatValidator,
    private readonly publishValidator: PublishValidator,
    private readonly transactionRunner: TransactionRunner,
    private readonly resultMapper: ProblemResultMapper,
  ) {}

  async execute(id: string, command: UpdateProblemCommand): Promise<ManagedProblemDetailResult> {
    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw new ProblemNotFoundError(id);
    }

    await this.authorization.requireOwned(existing, 'update');

    const expectedUpdatedAt = existing.updatedAt;

    if (existing.isOnHold) {
      throw new InvalidProblemState('publishStatus', 'A problem on hold cannot be updated');
    }

    if (
      command.problemType !== undefined &&
      command.problemType !== existing.problemType &&
      !existing.isDraft
    ) {
      throw new InvalidProblemState(
        'problemType',
        'The problem type can only be changed while the problem is a draft',
      );
    }

    const references: UnknownReference[] = [];

    if (command.topicIds !== undefined) {
      const missingTopicIds = await this.topicTagReader.findMissingTopicIds(command.topicIds);
      references.push(...missingTopicIds.map((id): UnknownReference => ({ kind: 'topic', id })));
    }

    if (command.tagIds !== undefined) {
      const missingTagIds = await this.topicTagReader.findMissingTagIds(command.tagIds);
      references.push(...missingTagIds.map((id): UnknownReference => ({ kind: 'tag', id })));
    }

    if (references.length > 0) {
      throw new UnknownReferenceError(references);
    }

    const update: UpdateProblemInput = {
      title: command.title,
      statement: command.statement,
      inputSpecification: command.inputSpecification,
      outputSpecification: command.outputSpecification,
      problemType: command.problemType,
      difficulty: command.difficulty,
      examples: command.examples,
      constraints: command.constraints,
      executionLimits: command.executionLimits,
      topics: command.topicIds?.map((id) => new TopicReference(id)),
      tags: command.tagIds?.map((id) => new TagReference(id)),
      enabledLanguages: command.enabledLanguages,
      starterCodes: command.starterCodes,
      functionContracts: command.functionContracts,
      oopContracts: command.oopContracts,
    };

    existing.update(update, new Date());

    this.contentValidator.assertSafe(existing);

    if (existing.isPublished) {
      const readiness = this.publishValidator.validate(existing, {
        slugAvailable: true,
      });

      if (!readiness.ready) {
        throw new PublishNotReadyError(readiness.issues);
      }
    }

    await this.transactionRunner.run(() => this.repository.save(existing, expectedUpdatedAt));

    const readiness = this.publishValidator.validate(existing, {
      slugAvailable: true,
    });

    return this.resultMapper.toManagedDetail(existing, readiness);
  }
}
