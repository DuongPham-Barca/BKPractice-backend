import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';
import { MAX_TEST_CASES } from '@learning/modules/problems/domain/value-objects';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddTestCaseRequestDto {
  @ApiPropertyOptional({
    description: 'Test case input. Defaults to an empty string.',
  })
  @IsOptional()
  @IsString()
  input?: string;

  @ApiProperty({ description: 'Expected output. May be empty.' })
  @IsString()
  expectedOutput!: string;

  @ApiPropertyOptional({ enum: ['HIDDEN', 'SAMPLE'], default: 'HIDDEN' })
  @IsOptional()
  @IsIn(['HIDDEN', 'SAMPLE'])
  visibility?: 'HIDDEN' | 'SAMPLE';

  @ApiProperty({ description: 'Score awarded for this test case.' })
  @IsInt()
  @Min(0)
  score!: number;

  @ApiPropertyOptional({ description: 'Display order. Defaults to the end of the suite.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateTestCaseRequestDto {
  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  input?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional({ enum: ['HIDDEN', 'SAMPLE'] })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(['HIDDEN', 'SAMPLE'])
  visibility?: 'HIDDEN' | 'SAMPLE';

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional({ description: 'Display order.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class ReorderTestCasesRequestDto {
  @ApiProperty({ type: [String], description: 'All test case IDs in the desired order.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TEST_CASES)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  testCaseIds!: string[];
}

export class SetHarnessRequestDto {
  @ApiProperty({ description: 'Language-specific test harness source.' })
  @IsString()
  @IsNotEmpty()
  source!: string;
}

export class HarnessLanguageParamDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  @IsIn(SUPPORTED_LANGUAGES)
  language!: SupportedLanguage;
}
