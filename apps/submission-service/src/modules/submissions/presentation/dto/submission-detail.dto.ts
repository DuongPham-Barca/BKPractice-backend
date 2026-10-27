import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { SubmissionExecutionError } from '../../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus } from '../../domain/submission-record';

export class SubmissionDetailDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SubmissionKind }) kind!: SubmissionKind;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true }) problemId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) problemTitle!: null;
  @ApiProperty() language!: string;
  @ApiProperty() sourceCodeSize!: number;
  @ApiProperty({ enum: SubmissionStatus }) status!: SubmissionStatus;
  @ApiPropertyOptional({ type: Number, nullable: true }) score!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) passedTests!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) totalTests!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) runtimeMs!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) memoryKb!: number | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty() sourceCode!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) compileOutput!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) error!: SubmissionExecutionError | null;
  @ApiPropertyOptional({ type: String, nullable: true }) stdout?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) stderr?: string | null;
}
