import type {
  ManagedProblemDetailResult,
  ManagedProblemSummaryResult,
  OopConstructorResult,
  PreviewProblemResult,
  ProblemDetailResult,
  ProblemReadinessIssueResult,
  ProblemReadinessResult,
  ProblemSummaryResult,
  SoftDeleteProblemResult,
} from '@learning/modules/problems/application/results/problem.results';
import type { ProblemPage } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import type {
  ExecutionLimitsResponseDto,
  FunctionContractResponseDto,
  FunctionParameterResponseDto,
  ManagedProblemListResponseDto,
  ManagedProblemResponseDto,
  ManagedProblemSummaryResponseDto,
  OopContractResponseDto,
  OopConstructorResponseDto,
  OopMethodResponseDto,
  ProblemDetailResponseDto,
  ProblemListResponseDto,
  ProblemSummaryResponseDto,
  ReadinessIssueResponseDto,
  ReadinessResponseDto,
  SoftDeleteProblemResponseDto,
  StarterCodeResponseDto,
  TagResponseDto,
  TopicResponseDto,
  VisibleExampleResponseDto,
} from '@learning/modules/problems/presentation/http/dto/problem-response.dto';
import {
  SampleTestCaseResponseDto,
  toTestSuiteSummaryDto,
} from '@learning/modules/problems/presentation/http/dto/test-case-response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProblemResponseMapper {
  toPublicSummary(result: ProblemSummaryResult): ProblemSummaryResponseDto {
    return this.summary(result);
  }

  toPublicDetail(result: ProblemDetailResult): ProblemDetailResponseDto {
    return {
      ...this.summary(result),
      ...this.detail(result),
    };
  }

  toManagedSummary(
    result: ManagedProblemSummaryResult,
    includeDeleted: boolean,
  ): ManagedProblemSummaryResponseDto {
    return {
      ...this.summary(result),
      publishStatus: result.publishStatus,
      readiness: this.readiness(result.readiness),
      testSuiteSummary: toTestSuiteSummaryDto(result.testSuiteSummary),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      ...(includeDeleted ? { deletedAt: toIsoOrNull(result.deletedAt) } : {}),
    };
  }

  toManagedDetail(
    result: ManagedProblemDetailResult,
    includeDeleted: boolean,
  ): ManagedProblemResponseDto {
    return {
      ...this.summary(result),
      ...this.detail(result),
      publishStatus: result.publishStatus,
      readiness: this.readiness(result.readiness),
      testSuiteSummary: toTestSuiteSummaryDto(result.testSuiteSummary),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      ...(includeDeleted ? { deletedAt: toIsoOrNull(result.deletedAt) } : {}),
    };
  }

  toPreviewDetail(
    result: PreviewProblemResult,
    includeDeleted: boolean,
  ): ManagedProblemResponseDto {
    return {
      ...this.summary(result),
      ...this.detail(result),
      publishStatus: result.publishStatus,
      readiness: this.readiness(result.readiness),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      ...(includeDeleted ? { deletedAt: toIsoOrNull(result.deletedAt) } : {}),
    };
  }

  toPublicPage(page: ProblemPage<ProblemSummaryResult>): ProblemListResponseDto {
    return {
      items: page.items.map((item) => this.summary(item)),
      total: page.total,
      page: page.page,
      limit: page.limit,
    };
  }

  toManagedPage(
    page: ProblemPage<ManagedProblemSummaryResult>,
    includeDeleted: boolean,
  ): ManagedProblemListResponseDto {
    return {
      items: page.items.map((item) => this.toManagedSummary(item, includeDeleted)),
      total: page.total,
      page: page.page,
      limit: page.limit,
    };
  }

  toSoftDelete(result: SoftDeleteProblemResult): SoftDeleteProblemResponseDto {
    return {
      id: result.id,
      publishStatus: result.publishStatus,
      deletedAt: result.deletedAt.toISOString(),
    };
  }

  private summary(result: ProblemSummaryResult): ProblemSummaryResponseDto {
    return {
      id: result.id,
      slug: result.slug,
      title: result.title,
      problemType: result.problemType,
      difficulty: result.difficulty,
      topics: result.topics.map((topic): TopicResponseDto => ({
        id: topic.id,
        name: topic.name,
      })),
      tags: result.tags.map((tag): TagResponseDto => ({ id: tag.id, name: tag.name })),
      enabledLanguages: [...result.enabledLanguages],
    };
  }

  private detail(result: ProblemDetailResult) {
    return {
      statement: result.statement,
      inputSpecification: result.inputSpecification,
      outputSpecification: result.outputSpecification,
      examples: result.examples.map((example): VisibleExampleResponseDto => ({
        input: example.input,
        output: example.output,
        explanation: example.explanation,
      })),
      constraints: result.constraints,
      executionLimits: {
        timeLimitMs: result.executionLimits.timeLimitMs,
        memoryLimitMb: result.executionLimits.memoryLimitMb,
      } satisfies ExecutionLimitsResponseDto,
      starterCodes: result.starterCodes.map((starterCode): StarterCodeResponseDto => ({
        language: starterCode.language,
        sourceCode: starterCode.sourceCode,
      })),
      functionContracts: result.functionContracts.map((contract): FunctionContractResponseDto => ({
        language: contract.language,
        functionName: contract.functionName,
        parameters: contract.parameters.map((parameter): FunctionParameterResponseDto => ({
          name: parameter.name,
          type: parameter.type,
        })),
        returnType: contract.returnType,
      })),
      sampleTestCases: result.sampleTestCases.map((sample): SampleTestCaseResponseDto => ({
        input: sample.input,
        expectedOutput: sample.expectedOutput,
        order: sample.order,
      })),
      oopContracts: result.oopContracts.map((contract): OopContractResponseDto => ({
        language: contract.language,
        structure: contract.structure,
        name: contract.name,
        constructorContract:
          contract.constructorContract === null
            ? null
            : this.oopConstructor(contract.constructorContract),
        methods: contract.methods.map((method): OopMethodResponseDto => ({
          name: method.name,
          access: method.access,
          parameters: method.parameters.map((parameter): FunctionParameterResponseDto => ({
            name: parameter.name,
            type: parameter.type,
          })),
          returnType: method.returnType,
        })),
      })),
    };
  }

  private oopConstructor(constructorContract: OopConstructorResult): OopConstructorResponseDto {
    return {
      access: constructorContract.access,
      parameters: constructorContract.parameters.map((parameter): FunctionParameterResponseDto => ({
        name: parameter.name,
        type: parameter.type,
      })),
    };
  }

  private readiness(result: ProblemReadinessResult): ReadinessResponseDto {
    return {
      ready: result.ready,
      issues: result.issues.map((issue): ReadinessIssueResponseDto => this.issue(issue)),
    };
  }

  private issue(issue: ProblemReadinessIssueResult): ReadinessIssueResponseDto {
    return issue.field === undefined
      ? { code: issue.code, message: issue.message }
      : { code: issue.code, field: issue.field, message: issue.message };
  }
}

function toIsoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}
