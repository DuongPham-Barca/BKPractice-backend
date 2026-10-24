import type { ProblemType, SupportedLanguage } from '@app/contracts';

import type { Difficulty, PublishStatus } from '../../domain/value-objects';

export interface TopicResult {
  readonly id: string;
  readonly name: string;
}

export interface TagResult {
  readonly id: string;
  readonly name: string;
}

export interface StarterCodeResult {
  readonly language: SupportedLanguage;
  readonly sourceCode: string;
}

export interface FunctionParameterResult {
  readonly name: string;
  readonly type: string;
}

export interface FunctionContractResult {
  readonly language: SupportedLanguage;
  readonly functionName: string;
  readonly parameters: readonly FunctionParameterResult[];
  readonly returnType: string;
}

export type OopStructureResult = 'CLASS' | 'INTERFACE';
export type OopAccessResult = 'PUBLIC' | 'PROTECTED' | 'PRIVATE';

export interface OopConstructorResult {
  readonly access: OopAccessResult;
  readonly parameters: readonly FunctionParameterResult[];
}

export interface OopMethodResult {
  readonly name: string;
  readonly access: OopAccessResult;
  readonly parameters: readonly FunctionParameterResult[];
  readonly returnType: string;
}

export interface OopContractResult {
  readonly language: SupportedLanguage;
  readonly structure: OopStructureResult;
  readonly name: string;
  readonly constructorContract: OopConstructorResult | null;
  readonly methods: readonly OopMethodResult[];
}

export interface VisibleExampleResult {
  readonly input: string;
  readonly output: string;
  readonly explanation: string | null;
}

export interface ProblemReadinessIssueResult {
  readonly code: string;
  readonly field?: string;
  readonly message: string;
}

export interface ProblemReadinessResult {
  readonly ready: boolean;
  readonly issues: readonly ProblemReadinessIssueResult[];
}

export interface ProblemSummaryResult {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly problemType: ProblemType;
  readonly difficulty: Difficulty;
  readonly topics: readonly TopicResult[];
  readonly tags: readonly TagResult[];
  readonly enabledLanguages: readonly SupportedLanguage[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProblemDetailResult extends ProblemSummaryResult {
  readonly statement: string;
  readonly inputSpecification: string | null;
  readonly outputSpecification: string | null;
  readonly examples: readonly VisibleExampleResult[];
  readonly constraints: string | null;
  readonly executionLimits: {
    readonly timeLimitMs: number;
    readonly memoryLimitMb: number;
  };
  readonly starterCodes: readonly StarterCodeResult[];
  readonly functionContracts: readonly FunctionContractResult[];
  readonly oopContracts: readonly OopContractResult[];
}

export interface ManagedProblemSummaryResult extends ProblemSummaryResult {
  readonly publishStatus: PublishStatus;
  readonly deletedAt: Date | null;
  readonly readiness: ProblemReadinessResult;
}

export interface ManagedProblemDetailResult extends ProblemDetailResult {
  readonly publishStatus: PublishStatus;
  readonly deletedAt: Date | null;
  readonly readiness: ProblemReadinessResult;
}

export interface SoftDeleteProblemResult {
  readonly id: string;
  readonly publishStatus: PublishStatus;
  readonly deletedAt: Date;
}
