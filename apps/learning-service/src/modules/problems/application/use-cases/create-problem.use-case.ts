import type { CreateProblemCommand } from '@learning/modules/problems/application/command/create-problem.command';
import { UnknownReferenceError } from '@learning/modules/problems/application/errors/unknown-reference.error';
import type { UnknownReference } from '@learning/modules/problems/application/errors/unknown-reference.error';
import type { ICreateProblemPortIn } from '@learning/modules/problems/application/ports/in/create-problem.port.in';
import type { TopicTagReader } from '@learning/modules/problems/application/ports/out/topic-tag-reader.port.out';
import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import { ProblemResultMapper } from '@learning/modules/problems/application/results/problem-result.mapper';
import type { ManagedProblemDetailResult } from '@learning/modules/problems/application/results/problem.results';
import { ProblemAuthorizationService } from '@learning/modules/problems/application/services/problem-authorization.service';
import { DuplicateSlugError } from '@learning/modules/problems/domain/errors/duplicate-slug.error';
import { Problem } from '@learning/modules/problems/domain/problem.aggregate';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { ContentFormatValidator } from '@learning/modules/problems/domain/services/content-format.validator';
import { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import {
  CreatedBy,
  TagReference,
  TopicReference,
} from '@learning/modules/problems/domain/value-objects';
import {
  PROBLEM_REPOSITORY,
  TOPIC_TAG_READER,
  TRANSACTION_RUNNER,
} from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CreateProblemUseCase implements ICreateProblemPortIn {
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
