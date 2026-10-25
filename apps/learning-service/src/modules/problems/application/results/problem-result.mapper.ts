import { Inject, Injectable } from '@nestjs/common';

import type { Problem } from '../../domain/problem.aggregate';
import type { ProblemPage } from '../../domain/repositories/problem.repository.port.out';
import type { PublishReadiness } from '../../domain/services/publish.validator';
import { TOPIC_TAG_READER } from '../../problem.tokens';
import type { TopicTagReader } from '../ports/out/topic-tag-reader.port.out';

import type {
  FunctionContractResult,
  ManagedProblemDetailResult,
  ManagedProblemSummaryResult,
  OopContractResult,
  ProblemDetailResult,
  ProblemReadinessIssueResult,
  ProblemReadinessResult,
  ProblemSummaryResult,
  StarterCodeResult,
  TagResult,
  TopicResult,
  VisibleExampleResult,
} from './problem.results';

interface ResolvedNames {
  readonly topicNames: ReadonlyMap<string, string>;
  readonly tagNames: ReadonlyMap<string, string>;
}

@Injectable()
export class ProblemResultMapper {
  constructor(@Inject(TOPIC_TAG_READER) private readonly topicTagReader: TopicTagReader) {}

  async toSummary(problem: Problem): Promise<ProblemSummaryResult> {
    return this.summary(problem, await this.loadNames([problem]));
  }

  async toDetail(problem: Problem): Promise<ProblemDetailResult> {
    return this.detail(problem, await this.loadNames([problem]));
  }

  async toManagedSummary(
    problem: Problem,
    readiness: PublishReadiness,
  ): Promise<ManagedProblemSummaryResult> {
    const summary = await this.toSummary(problem);

    return {
      ...summary,
      publishStatus: problem.publishStatus,
      deletedAt: problem.deletedAt,
      readiness: toReadinessResult(readiness),
    };
  }

  async toManagedDetail(
    problem: Problem,
    readiness: PublishReadiness,
  ): Promise<ManagedProblemDetailResult> {
    const detail = await this.toDetail(problem);

    return {
      ...detail,
      publishStatus: problem.publishStatus,
      deletedAt: problem.deletedAt,
      readiness: toReadinessResult(readiness),
    };
  }

  async toPage(
    problems: readonly Problem[],
    total: number,
    page: number,
    limit: number,
  ): Promise<ProblemPage<ProblemSummaryResult>> {
    const names = await this.loadNames(problems);

    return {
      items: problems.map((problem) => this.summary(problem, names)),
      total,
      page,
      limit,
    };
  }

  async toManagedPage(
    problems: readonly Problem[],
    total: number,
    page: number,
    limit: number,
    readinessByProblemId: ReadonlyMap<string, PublishReadiness>,
  ): Promise<ProblemPage<ManagedProblemSummaryResult>> {
    const names = await this.loadNames(problems);

    return {
      items: problems.map((problem) => {
        const readiness = readinessByProblemId.get(problem.id.value);

        if (readiness === undefined) {
          throw new Error(`Missing readiness for problem ${problem.id.value}`);
        }

        return {
          ...this.summary(problem, names),
          publishStatus: problem.publishStatus,
          deletedAt: problem.deletedAt,
          readiness: toReadinessResult(readiness),
        };
      }),
      total,
      page,
      limit,
    };
  }

  private async loadNames(problems: readonly Problem[]): Promise<ResolvedNames> {
    const topicIds = unique(
      problems.flatMap((problem) => problem.topics.map((topic) => topic.value)),
    );
    const tagIds = unique(problems.flatMap((problem) => problem.tags.map((tag) => tag.value)));

    const [topicNames, tagNames] = await Promise.all([
      this.topicTagReader.findTopicNames(topicIds),
      this.topicTagReader.findTagNames(tagIds),
    ]);

    return { topicNames, tagNames };
  }

  private summary(problem: Problem, names: ResolvedNames): ProblemSummaryResult {
    return {
      id: problem.id.value,
      slug: problem.slug.value,
      title: problem.title.value,
      problemType: problem.problemType,
      difficulty: problem.difficulty,
      topics: problem.topics.map((topic): TopicResult => ({
        id: topic.value,
        name: requireName(names.topicNames, topic.value, 'topic'),
      })),
      tags: problem.tags.map((tag): TagResult => ({
        id: tag.value,
        name: requireName(names.tagNames, tag.value, 'tag'),
      })),
      enabledLanguages: problem.enabledLanguages.map((language) => language.value),
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  private detail(problem: Problem, names: ResolvedNames): ProblemDetailResult {
    return {
      ...this.summary(problem, names),
      statement: problem.statement.value,
      inputSpecification: problem.inputSpecification?.value ?? null,
      outputSpecification: problem.outputSpecification?.value ?? null,
      examples: problem.examples.map((example): VisibleExampleResult => ({
        input: example.input,
        output: example.output,
        explanation: example.explanation,
      })),
      constraints: problem.constraints?.value ?? null,
      executionLimits: {
        timeLimitMs: problem.executionLimits.timeLimitMs,
        memoryLimitMb: problem.executionLimits.memoryLimitMb,
      },
      starterCodes: problem.starterCodes.map((starterCode): StarterCodeResult => ({
        language: starterCode.language,
        sourceCode: starterCode.sourceCode,
      })),
      functionContracts: Array.from(
        problem.functionContracts.entries(),
        ([language, contract]): FunctionContractResult => ({
          language,
          functionName: contract.functionName,
          parameters: contract.parameters.map((parameter) => ({
            name: parameter.name,
            type: parameter.type,
          })),
          returnType: contract.returnType,
        }),
      ),
      oopContracts: Array.from(
        problem.oopContracts.entries(),
        ([language, contract]): OopContractResult => ({
          language,
          structure: contract.structure,
          name: contract.name,
          constructorContract:
            contract.constructorContract === null
              ? null
              : {
                  access: contract.constructorContract.access,
                  parameters: contract.constructorContract.parameters.map((parameter) => ({
                    name: parameter.name,
                    type: parameter.type,
                  })),
                },
          methods: contract.methods.map((method) => ({
            name: method.name,
            access: method.access,
            parameters: method.parameters.map((parameter) => ({
              name: parameter.name,
              type: parameter.type,
            })),
            returnType: method.returnType,
          })),
        }),
      ),
    };
  }
}

function toReadinessResult(readiness: PublishReadiness): ProblemReadinessResult {
  return {
    ready: readiness.ready,
    issues: readiness.issues.map((issue): ProblemReadinessIssueResult =>
      issue.field === undefined
        ? { code: issue.code, message: issue.message }
        : { code: issue.code, field: issue.field, message: issue.message },
    ),
  };
}

function requireName(
  names: ReadonlyMap<string, string>,
  id: string,
  kind: 'topic' | 'tag',
): string {
  const name = names.get(id);

  if (name === undefined) {
    throw new Error(`Missing ${kind} name for ${id}`);
  }

  return name;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
