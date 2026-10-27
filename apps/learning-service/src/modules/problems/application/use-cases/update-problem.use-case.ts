import type { UpdateProblemCommand } from '@learning/modules/problems/application/command/update-problem.command';
import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import { PublishNotReadyError } from '@learning/modules/problems/application/errors/publish-not-ready.error';
import { UnknownReferenceError } from '@learning/modules/problems/application/errors/unknown-reference.error';
import type { UnknownReference } from '@learning/modules/problems/application/errors/unknown-reference.error';
import type { IUpdateProblemPortIn } from '@learning/modules/problems/application/ports/in/update-problem.port.in';
import type { TopicTagReader } from '@learning/modules/problems/application/ports/out/topic-tag-reader.port.out';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { ProblemResultMapper } from '@learning/modules/problems/application/results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import { InvalidProblemState } from '@learning/modules/problems/domain/errors/invalid-problem-state.error';
import type { UpdateProblemInput } from '@learning/modules/problems/domain/problem.aggregate';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { ContentFormatValidator } from '@learning/modules/problems/domain/services/content-format.validator';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { TagReference, TopicReference } from '@learning/modules/problems/domain/value-objects';
import {
  PROBLEM_REPOSITORY,
  TOPIC_TAG_READER,
  TRANSACTION_RUNNER,
} from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UpdateProblemUseCase implements IUpdateProblemPortIn {
  constructor(
    private readonly authorization: ProblemAuthorizationService,
    @Inject(TOPIC_TAG_READER)
    private readonly topicTagReader: TopicTagReader,
    @Inject(PROBLEM_REPOSITORY)
    private readonly repository: ProblemRepository,
    private readonly contentValidator: ContentFormatValidator,
    private readonly publishValidator: PublishValidator,
    @Inject(TRANSACTION_RUNNER)
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
