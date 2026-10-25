import type { SupportedLanguage } from '@app/contracts';
import type { CreateProblemCommand } from '@learning/modules/problems/application/use-cases/create-problem.use-case';
import type { UpdateProblemCommand } from '@learning/modules/problems/application/use-cases/update-problem.use-case';
import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';
import {
  Constraints,
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
  TagReference,
  TopicReference,
  VisibleExample,
  type OopMethod,
} from '@learning/modules/problems/domain/value-objects';
import { Injectable } from '@nestjs/common';

import type {
  FunctionContractDto,
  FunctionParameterDto,
  OopContractDto,
  OopMethodDto,
  VisibleExampleDto,
} from '../dto/content.dto';
import type { CreateProblemRequestDto } from '../dto/create-problem.request.dto';
import type { UpdateProblemRequestDto } from '../dto/update-problem.request.dto';

const DEFAULT_TIME_LIMIT_MS = 1_000;
const DEFAULT_MEMORY_LIMIT_MB = 256;

@Injectable()
export class ProblemRequestMapper {
  toCreateCommand(dto: CreateProblemRequestDto): CreateProblemCommand {
    const limits = dto.executionLimits ?? {
      timeLimitMs: DEFAULT_TIME_LIMIT_MS,
      memoryLimitMb: DEFAULT_MEMORY_LIMIT_MB,
    };

    return {
      slug: new Slug(dto.slug),
      title: new ProblemTitle(dto.title),
      statement: new ProblemStatement(dto.statement),
      inputSpecification: nullableString(dto.inputSpecification, InputSpecification),
      outputSpecification: nullableString(dto.outputSpecification, OutputSpecification),
      problemType: dto.problemType,
      difficulty: dto.difficulty,
      examples: (dto.examples ?? []).map(toVisibleExample),
      constraints: nullableString(dto.constraints, Constraints),
      executionLimits: new ExecutionLimits(limits),
      topicIds: (dto.topicIds ?? []).map((id) => new TopicReference(id).value),
      tagIds: (dto.tagIds ?? []).map((id) => new TagReference(id).value),
      enabledLanguages: (dto.enabledLanguages ?? []).map(
        (language) => new EnabledLanguage(language),
      ),
      starterCodes: (dto.starterCodes ?? []).map((starterCode) => new StarterCode(starterCode)),
      functionContracts: toFunctionContractMap(dto.functionContracts ?? []),
      oopContracts: toOopContractMap(dto.oopContracts ?? []),
    };
  }

  toUpdateCommand(dto: UpdateProblemRequestDto): UpdateProblemCommand {
    const command: MutableUpdateCommand = {};

    if (dto.title !== undefined) {
      command.title = new ProblemTitle(dto.title);
    }

    if (dto.statement !== undefined) {
      command.statement = new ProblemStatement(dto.statement);
    }

    if (dto.inputSpecification !== undefined) {
      command.inputSpecification = nullableString(dto.inputSpecification, InputSpecification);
    }

    if (dto.outputSpecification !== undefined) {
      command.outputSpecification = nullableString(dto.outputSpecification, OutputSpecification);
    }

    if (dto.problemType !== undefined) {
      command.problemType = dto.problemType;
    }

    if (dto.difficulty !== undefined) {
      command.difficulty = dto.difficulty;
    }

    if (dto.examples !== undefined) {
      command.examples = dto.examples.map(toVisibleExample);
    }

    if (dto.constraints !== undefined) {
      command.constraints = nullableString(dto.constraints, Constraints);
    }

    if (dto.executionLimits !== undefined) {
      command.executionLimits = new ExecutionLimits(dto.executionLimits);
    }

    if (dto.topicIds !== undefined) {
      command.topicIds = dto.topicIds.map((id) => new TopicReference(id).value);
    }

    if (dto.tagIds !== undefined) {
      command.tagIds = dto.tagIds.map((id) => new TagReference(id).value);
    }

    if (dto.enabledLanguages !== undefined) {
      command.enabledLanguages = dto.enabledLanguages.map(
        (language) => new EnabledLanguage(language),
      );
    }

    if (dto.starterCodes !== undefined) {
      command.starterCodes = dto.starterCodes.map((starterCode) => new StarterCode(starterCode));
    }

    if (dto.functionContracts !== undefined) {
      command.functionContracts = toFunctionContractMap(dto.functionContracts);
    }

    if (dto.oopContracts !== undefined) {
      command.oopContracts = toOopContractMap(dto.oopContracts);
    }

    return command;
  }
}

type MutableUpdateCommand = {
  -readonly [K in keyof UpdateProblemCommand]: UpdateProblemCommand[K];
};

function nullableString<T>(
  value: string | null | undefined,
  factory: new (value: string) => T,
): T | null {
  return value === undefined || value === null ? null : new factory(value);
}

function toVisibleExample(example: VisibleExampleDto): VisibleExample {
  return new VisibleExample({
    input: example.input,
    output: example.output,
    explanation: example.explanation ?? null,
  });
}

function toFunctionContractMap(
  contracts: readonly FunctionContractDto[],
): ReadonlyMap<SupportedLanguage, FunctionContract> {
  const result = new Map<SupportedLanguage, FunctionContract>();

  for (const contract of contracts) {
    if (result.has(contract.language)) {
      throw new DomainValidationError(
        'functionContracts.language',
        'function contract languages must be unique',
      );
    }

    result.set(
      contract.language,
      new FunctionContract({
        functionName: contract.functionName,
        parameters: contract.parameters.map(toFunctionParameter),
        returnType: contract.returnType,
      }),
    );
  }

  return result;
}

function toOopContractMap(
  contracts: readonly OopContractDto[],
): ReadonlyMap<SupportedLanguage, OopContract> {
  const result = new Map<SupportedLanguage, OopContract>();

  for (const contract of contracts) {
    if (result.has(contract.language)) {
      throw new DomainValidationError(
        'oopContracts.language',
        'OOP contract languages must be unique',
      );
    }

    result.set(
      contract.language,
      new OopContract({
        structure: contract.structure,
        name: contract.name,
        constructorContract:
          contract.constructorContract === undefined || contract.constructorContract === null
            ? null
            : {
                access: contract.constructorContract.access,
                parameters: contract.constructorContract.parameters.map(toFunctionParameter),
              },
        methods: contract.methods.map(toOopMethod),
      }),
    );
  }

  return result;
}

function toOopMethod(method: OopMethodDto): OopMethod {
  return {
    name: method.name,
    access: method.access,
    parameters: method.parameters.map(toFunctionParameter),
    returnType: method.returnType,
  };
}

function toFunctionParameter(parameter: FunctionParameterDto) {
  return { name: parameter.name, type: parameter.type };
}
