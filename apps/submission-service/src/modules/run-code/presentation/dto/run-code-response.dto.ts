import { ApiProperty } from '@nestjs/swagger';
import {
  SubmissionKind,
  SubmissionStatus,
} from '@submission/modules/submissions/domain/submission-record';

export class RunCodeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: [SubmissionKind.Run] }) kind!: SubmissionKind.Run;
  @ApiProperty({ enum: [SubmissionStatus.Queued] }) status!: SubmissionStatus.Queued;
  @ApiProperty() language!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
