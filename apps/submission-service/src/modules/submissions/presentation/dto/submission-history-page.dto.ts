import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SubmissionKind, SubmissionStatus } from '../../domain/submission-record';

export class SubmissionHistoryItemDto {
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
}

export class HistoryCursorDto {
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'uuid' }) publicId!: string;
}

export class SubmissionHistoryPageDto {
  @ApiProperty({ type: [SubmissionHistoryItemDto] }) items!: SubmissionHistoryItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiPropertyOptional({ type: HistoryCursorDto, nullable: true })
  nextCursor!: HistoryCursorDto | null;
}
