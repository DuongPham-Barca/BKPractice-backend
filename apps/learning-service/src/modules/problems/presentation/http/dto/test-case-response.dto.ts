import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@app/contracts';
import type { TestSuiteSummaryResult } from '@learning/modules/problems/application/results/test-case.results';
import type { TestCaseVisibilityValue } from '@learning/modules/problems/domain/value-objects';
import { ApiProperty } from '@nestjs/swagger';

export class SampleTestCaseResponseDto {
  @ApiProperty()
  input!: string;

  @ApiProperty()
  expectedOutput!: string;

  @ApiProperty()
  order!: number;
}

export class TestCaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  input!: string;

  @ApiProperty()
  expectedOutput!: string;

  @ApiProperty({ enum: ['HIDDEN', 'SAMPLE'] })
  visibility!: TestCaseVisibilityValue;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  displayOrder!: number;
}

export class TestSuiteSummaryResponseDto {
  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  hiddenCount!: number;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty()
  totalBytes!: number;

  @ApiProperty({ enum: SUPPORTED_LANGUAGES, isArray: true })
  harnessLanguages!: SupportedLanguage[];
}

export class HarnessResponseDto {
  @ApiProperty({ enum: SUPPORTED_LANGUAGES })
  language!: SupportedLanguage;

  @ApiProperty()
  source!: string;
}

export class TestCaseListResponseDto {
  @ApiProperty({ type: [TestCaseResponseDto] })
  items!: TestCaseResponseDto[];

  @ApiProperty({ type: TestSuiteSummaryResponseDto })
  testSuiteSummary!: TestSuiteSummaryResponseDto;
}

export function toTestSuiteSummaryDto(result: TestSuiteSummaryResult): TestSuiteSummaryResponseDto {
  return {
    totalCount: result.totalCount,
    hiddenCount: result.hiddenCount,
    totalScore: result.totalScore,
    totalBytes: result.totalBytes,
    harnessLanguages: [...result.harnessLanguages],
  };
}
