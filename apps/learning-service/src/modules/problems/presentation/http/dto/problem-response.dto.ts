import {
  PROBLEM_TYPES,
  SUPPORTED_LANGUAGES,
  type ProblemType,
  type SupportedLanguage,
} from '@app/contracts';
import type { Difficulty, PublishStatus } from '@learning/modules/problems/domain/value-objects';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class VisibleExampleResponseDto {
  @ApiProperty()
  input!: string;

  @ApiProperty()
  output!: string;

  @ApiProperty({ nullable: true })
  explanation!: string | null;
}

export class ExecutionLimitsResponseDto {
  @ApiProperty()
  timeLimitMs!: number;

  @ApiProperty()
  memoryLimitMb!: number;
}

export class StarterCodeResponseDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  language!: SupportedLanguage;

  @ApiProperty()
  sourceCode!: string;
}

export class FunctionParameterResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;
}

export class FunctionContractResponseDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  language!: SupportedLanguage;

  @ApiProperty()
  functionName!: string;

  @ApiProperty({ type: [FunctionParameterResponseDto] })
  parameters!: FunctionParameterResponseDto[];

  @ApiProperty()
  returnType!: string;
}

export class OopConstructorResponseDto {
  @ApiProperty({ enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'] })
  access!: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';

  @ApiProperty({ type: [FunctionParameterResponseDto] })
  parameters!: FunctionParameterResponseDto[];
}

export class OopMethodResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'] })
  access!: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';

  @ApiProperty({ type: [FunctionParameterResponseDto] })
  parameters!: FunctionParameterResponseDto[];

  @ApiProperty()
  returnType!: string;
}

export class OopContractResponseDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  language!: SupportedLanguage;

  @ApiProperty({ enum: ['CLASS', 'INTERFACE'] })
  structure!: 'CLASS' | 'INTERFACE';

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: OopConstructorResponseDto, nullable: true })
  constructorContract!: OopConstructorResponseDto | null;

  @ApiProperty({ type: [OopMethodResponseDto] })
  methods!: OopMethodResponseDto[];
}

export class ReadinessIssueResponseDto {
  @ApiProperty()
  code!: string;

  @ApiPropertyOptional()
  field?: string;

  @ApiProperty()
  message!: string;
}

export class ReadinessResponseDto {
  @ApiProperty()
  ready!: boolean;

  @ApiProperty({ type: [ReadinessIssueResponseDto] })
  issues!: ReadinessIssueResponseDto[];
}

export class ProblemSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: PROBLEM_TYPES })
  problemType!: ProblemType;

  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  difficulty!: Difficulty;

  @ApiProperty({ type: [TopicResponseDto] })
  topics!: TopicResponseDto[];

  @ApiProperty({ type: [TagResponseDto] })
  tags!: TagResponseDto[];

  @ApiProperty({ enum: SUPPORTED_LANGUAGES, isArray: true })
  enabledLanguages!: SupportedLanguage[];
}

export class ProblemDetailResponseDto extends ProblemSummaryResponseDto {
  @ApiProperty()
  statement!: string;

  @ApiProperty({ nullable: true })
  inputSpecification!: string | null;

  @ApiProperty({ nullable: true })
  outputSpecification!: string | null;

  @ApiProperty({ type: [VisibleExampleResponseDto] })
  examples!: VisibleExampleResponseDto[];

  @ApiProperty({ nullable: true })
  constraints!: string | null;

  @ApiProperty({ type: ExecutionLimitsResponseDto })
  executionLimits!: ExecutionLimitsResponseDto;

  @ApiProperty({ type: [StarterCodeResponseDto] })
  starterCodes!: StarterCodeResponseDto[];

  @ApiProperty({ type: [FunctionContractResponseDto] })
  functionContracts!: FunctionContractResponseDto[];

  @ApiProperty({ type: [OopContractResponseDto] })
  oopContracts!: OopContractResponseDto[];
}

export class ManagedProblemSummaryResponseDto extends ProblemSummaryResponseDto {
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ON_HOLD'] })
  publishStatus!: PublishStatus;

  @ApiProperty({ type: ReadinessResponseDto })
  readiness!: ReadinessResponseDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  deletedAt?: string | null;
}

export class ManagedProblemResponseDto extends ProblemDetailResponseDto {
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ON_HOLD'] })
  publishStatus!: PublishStatus;

  @ApiProperty({ type: ReadinessResponseDto })
  readiness!: ReadinessResponseDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  deletedAt?: string | null;
}

export class ProblemListResponseDto {
  @ApiProperty({ type: [ProblemSummaryResponseDto] })
  items!: ProblemSummaryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ManagedProblemListResponseDto {
  @ApiProperty({ type: [ManagedProblemSummaryResponseDto] })
  items!: ManagedProblemSummaryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class SoftDeleteProblemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ON_HOLD'] })
  publishStatus!: PublishStatus;

  @ApiProperty()
  deletedAt!: string;
}
