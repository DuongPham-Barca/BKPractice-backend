import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class VisibleExampleDto {
  @ApiProperty()
  @IsString()
  @Length(1, 20_000)
  input!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 20_000)
  output!: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(20_000)
  explanation?: string | null;
}

export class FunctionParameterDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  type!: string;
}

export class FunctionContractDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  @IsIn(SUPPORTED_LANGUAGES)
  language!: SupportedLanguage;

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  functionName!: string;

  @ApiProperty({ type: [FunctionParameterDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FunctionParameterDto)
  parameters!: FunctionParameterDto[];

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  returnType!: string;
}

export class OopConstructorDto {
  @ApiProperty({ enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'] })
  @IsIn(['PUBLIC', 'PROTECTED', 'PRIVATE'])
  access!: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';

  @ApiProperty({ type: [FunctionParameterDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FunctionParameterDto)
  parameters!: FunctionParameterDto[];
}

export class OopMethodDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'] })
  @IsIn(['PUBLIC', 'PROTECTED', 'PRIVATE'])
  access!: 'PUBLIC' | 'PROTECTED' | 'PRIVATE';

  @ApiProperty({ type: [FunctionParameterDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FunctionParameterDto)
  parameters!: FunctionParameterDto[];

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  returnType!: string;
}

export class OopContractDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  @IsIn(SUPPORTED_LANGUAGES)
  language!: SupportedLanguage;

  @ApiProperty({ enum: ['CLASS', 'INTERFACE'] })
  @IsIn(['CLASS', 'INTERFACE'])
  structure!: 'CLASS' | 'INTERFACE';

  @ApiProperty()
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({ type: OopConstructorDto, nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ValidateNested()
  @Type(() => OopConstructorDto)
  constructorContract?: OopConstructorDto | null;

  @ApiProperty({ type: [OopMethodDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OopMethodDto)
  methods!: OopMethodDto[];
}

export class StarterCodeDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  @IsIn(SUPPORTED_LANGUAGES)
  language!: SupportedLanguage;

  @ApiProperty()
  @IsString()
  @Length(1, 100_000)
  sourceCode!: string;
}

export class ExecutionLimitsDto {
  @ApiProperty({ minimum: 1, maximum: 10_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  timeLimitMs!: number;

  @ApiProperty({ minimum: 1, maximum: 1_024 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_024)
  memoryLimitMb!: number;
}
