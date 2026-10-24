import { SUPPORTED_LANGUAGES } from '@app/contracts';
import type { SupportedLanguage } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { Problem } from '../../domain/problem.aggregate';
import type { ProblemSnapshot } from '../../domain/problem.aggregate';
import {
  Constraints,
  CreatedBy,
  DeletedMarker,
  Difficulty as DomainDifficulty,
  EnabledLanguage,
  ExecutionLimits,
  FunctionContract,
  InputSpecification,
  OopContract,
  OutputSpecification,
  ProblemId,
  ProblemStatement,
  ProblemTitle,
  PublishStatus as DomainPublishStatus,
  Slug,
  StarterCode,
  TagReference,
  TopicReference,
  VisibleExample,
  parseDifficulty,
  parseProblemType,
  parsePublishStatus,
} from '../../domain/value-objects';
import type { OopConstructor, OopMethod } from '../../domain/value-objects';
import {
  Difficulty as EntityDifficulty,
  Problem as ProblemEntity,
  PublishStatus as EntityPublishStatus,
} from '../../entities/problem.entity';
import type { ProblemTypeConfigJson } from '../../entities/problem.entity';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class ProblemPersistenceMapper {
  toDomain(entity: ProblemEntity): Problem {
    const snapshot: ProblemSnapshot = {
      id: ProblemId.from(entity.id),
      slug: new Slug(entity.slug),
      title: new ProblemTitle(entity.title),
      statement: new ProblemStatement(entity.description),
      inputSpecification:
        entity.inputSpecification === null
          ? null
          : new InputSpecification(entity.inputSpecification),
      outputSpecification:
        entity.outputSpecification === null
          ? null
          : new OutputSpecification(entity.outputSpecification),
      problemType: parseProblemType(entity.problemType),
      difficulty: parseDifficulty(entity.difficulty),
      examples: (entity.examples ?? []).map((example) => parseExample(example)),
      constraints: entity.constraints === null ? null : new Constraints(entity.constraints),
      executionLimits: new ExecutionLimits({
        timeLimitMs: entity.timeLimitMs,
        memoryLimitMb: entity.memoryLimitMb,
      }),
      topics: (entity.topics ?? []).map((topic) => new TopicReference(topic.id)),
      tags: (entity.tags ?? []).map((tag) => new TagReference(tag.id)),
      enabledLanguages: (entity.languages ?? [])
        .filter((language) => language.enabled)
        .map((language) => new EnabledLanguage(language.language)),
      starterCodes: (entity.starterCodes ?? []).map(
        (starterCode) =>
          new StarterCode({
            language: starterCode.language,
            sourceCode: starterCode.sourceCode,
          }),
      ),
      functionContracts: parseFunctionContracts(entity.typeConfig),
      oopContracts: parseOopContracts(entity.typeConfig),
      publishStatus: parsePublishStatus(entity.publishStatus),
      deletedMarker: DeletedMarker.from(entity.deletedAt),
      createdBy: new CreatedBy(entity.createdBy),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Problem.rehydrate(snapshot);
  }

  toInsertValues(problem: Problem): Partial<ProblemEntity> {
    return {
      id: problem.id.value,
      title: problem.title.value,
      slug: problem.slug.value,
      description: problem.statement.value,
      problemType: problem.problemType,
      difficulty: toEntityDifficulty(problem.difficulty),
      inputSpecification: problem.inputSpecification?.value ?? null,
      outputSpecification: problem.outputSpecification?.value ?? null,
      examples: toExamples(problem),
      constraints: problem.constraints?.value ?? null,
      timeLimitMs: problem.executionLimits.timeLimitMs,
      memoryLimitMb: problem.executionLimits.memoryLimitMb,
      publishStatus: toEntityPublishStatus(problem.publishStatus),
      typeConfig: toTypeConfig(problem),
      deletedAt: problem.deletedAt,
      createdBy: problem.createdBy.value,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  toUpdateValues(problem: Problem): Partial<ProblemEntity> {
    return {
      title: problem.title.value,
      description: problem.statement.value,
      problemType: problem.problemType,
      difficulty: toEntityDifficulty(problem.difficulty),
      inputSpecification: problem.inputSpecification?.value ?? null,
      outputSpecification: problem.outputSpecification?.value ?? null,
      examples: toExamples(problem),
      constraints: problem.constraints?.value ?? null,
      timeLimitMs: problem.executionLimits.timeLimitMs,
      memoryLimitMb: problem.executionLimits.memoryLimitMb,
      publishStatus: toEntityPublishStatus(problem.publishStatus),
      typeConfig: toTypeConfig(problem),
      deletedAt: problem.deletedAt,
      updatedAt: problem.updatedAt,
    };
  }
}

function parseExample(value: Record<string, unknown>): VisibleExample {
  return new VisibleExample({
    input: value.input as string,
    output: value.output as string,
    explanation:
      value.explanation === undefined || value.explanation === null
        ? null
        : (value.explanation as string),
  });
}

function parseFunctionContracts(
  typeConfig: ProblemTypeConfigJson | null,
): ReadonlyMap<SupportedLanguage, FunctionContract> {
  const result = new Map<SupportedLanguage, FunctionContract>();

  if (typeConfig === null) {
    return result;
  }

  const contracts = typeConfig.languageContract;

  if (contracts === undefined || contracts === null) {
    return result;
  }

  for (const [language, raw] of languageEntries(contracts, 'type_config.languageContract')) {
    const value = asRecord(raw, `type_config.languageContract.${language}`);

    result.set(
      language,
      new FunctionContract({
        functionName: value.functionName as string,
        parameters: (value.parameters as JsonRecord[]).map((parameter) => ({
          name: parameter.name as string,
          type: parameter.type as string,
        })),
        returnType: value.returnType as string,
      }),
    );
  }

  return result;
}

function parseOopContracts(
  typeConfig: ProblemTypeConfigJson | null,
): ReadonlyMap<SupportedLanguage, OopContract> {
  const result = new Map<SupportedLanguage, OopContract>();

  if (typeConfig === null) {
    return result;
  }

  const contracts = typeConfig.ooContract;

  if (contracts === undefined || contracts === null) {
    return result;
  }

  for (const [language, raw] of languageEntries(contracts, 'type_config.ooContract')) {
    const value = asRecord(raw, `type_config.ooContract.${language}`);
    const constructorContract = readConstructor(value, language);

    result.set(
      language,
      new OopContract({
        structure: value.structure as string,
        name: value.name as string,
        constructorContract,
        methods: (value.methods as JsonRecord[]).map((method): OopMethod => ({
          name: method.name as string,
          access: method.access as OopMethod['access'],
          parameters: (method.parameters as JsonRecord[]).map((parameter) => ({
            name: parameter.name as string,
            type: parameter.type as string,
          })),
          returnType: method.returnType as string,
        })),
      }),
    );
  }

  return result;
}

function readConstructor(value: JsonRecord, language: SupportedLanguage): OopConstructor | null {
  if (!Object.prototype.hasOwnProperty.call(value, 'constructor')) {
    return null;
  }

  const raw = value['constructor'];

  if (raw === null || raw === undefined) {
    return null;
  }

  const constructor = asRecord(raw, `type_config.ooContract.${language}.constructor`);

  return {
    access: constructor.access as OopConstructor['access'],
    parameters: (constructor.parameters as JsonRecord[]).map((parameter) => ({
      name: parameter.name as string,
      type: parameter.type as string,
    })),
  };
}

function languageEntries(
  value: Record<string, unknown>,
  field: string,
): readonly [SupportedLanguage, unknown][] {
  return Object.entries(value).map(([language, contract]) => {
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
      throw new Error(`${field} contains unsupported language ${language}`);
    }

    return [language as SupportedLanguage, contract];
  });
}

function asRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }

  return value as JsonRecord;
}

function toExamples(problem: Problem): Record<string, unknown>[] {
  return problem.examples.map((example) => ({
    input: example.input,
    output: example.output,
    explanation: example.explanation,
  }));
}

function toTypeConfig(problem: Problem): ProblemTypeConfigJson | null {
  const languageContract = Object.fromEntries(
    Array.from(problem.functionContracts.entries(), ([language, contract]) => [
      language,
      {
        functionName: contract.functionName,
        parameters: contract.parameters.map((parameter) => ({
          name: parameter.name,
          type: parameter.type,
        })),
        returnType: contract.returnType,
      },
    ]),
  );
  const ooContract = Object.fromEntries(
    Array.from(problem.oopContracts.entries(), ([language, contract]) => [
      language,
      {
        structure: contract.structure,
        name: contract.name,
        constructor:
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
      },
    ]),
  );

  if (Object.keys(languageContract).length === 0 && Object.keys(ooContract).length === 0) {
    return null;
  }

  const config: ProblemTypeConfigJson = {};

  if (Object.keys(languageContract).length > 0) {
    config.languageContract = languageContract;
  }

  if (Object.keys(ooContract).length > 0) {
    config.ooContract = ooContract;
  }

  return config;
}

function toEntityDifficulty(value: DomainDifficulty): EntityDifficulty {
  switch (value) {
    case 'EASY':
      return EntityDifficulty.Easy;
    case 'MEDIUM':
      return EntityDifficulty.Medium;
    case 'HARD':
      return EntityDifficulty.Hard;
  }
}

function toEntityPublishStatus(value: DomainPublishStatus): EntityPublishStatus {
  switch (value) {
    case 'DRAFT':
      return EntityPublishStatus.Draft;
    case 'PUBLISHED':
      return EntityPublishStatus.Published;
    case 'ON_HOLD':
      return EntityPublishStatus.OnHold;
  }
}
