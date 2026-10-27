import { SUPPORTED_LANGUAGES } from '@app/contracts';
import type { SupportedLanguage } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitCodeRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  problemId!: string;

  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  @IsIn(SUPPORTED_LANGUAGES)
  language!: SupportedLanguage;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  sourceCode!: string;
}
