import { ApiProperty } from '@nestjs/swagger';

import { SubmissionKind, SubmissionStatus } from '../../domain/submission-record';

export class SubmitCodeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: [SubmissionKind.Submit] }) kind!: SubmissionKind.Submit;
  @ApiProperty({ enum: [SubmissionStatus.Queued] }) status!: SubmissionStatus.Queued;
  @ApiProperty({ format: 'uuid' }) problemId!: string;
  @ApiProperty() language!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
