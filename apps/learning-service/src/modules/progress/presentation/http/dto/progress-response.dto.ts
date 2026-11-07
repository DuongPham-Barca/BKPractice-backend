import { ApiProperty } from '@nestjs/swagger';
export class SolvedProblemResponseDto {
  @ApiProperty({ format: 'uuid' }) problemId!: string;
  @ApiProperty({ format: 'date-time' }) solvedAt!: string;
}
export class SolvedProblemPageResponseDto {
  @ApiProperty({ type: [SolvedProblemResponseDto] }) items!: SolvedProblemResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
export class SolvedStatusResponseDto {
  @ApiProperty({ format: 'uuid' }) problemId!: string;
  @ApiProperty() solved!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) solvedAt!: string | null;
}
export class ChapterProgressResponseDto {
  @ApiProperty({ format: 'uuid' }) chapterId!: string;
  @ApiProperty() solved!: number;
  @ApiProperty() total!: number;
}
export class CourseProgressResponseDto {
  @ApiProperty({ format: 'uuid' }) courseId!: string;
  @ApiProperty() solved!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ChapterProgressResponseDto] }) chapters!: ChapterProgressResponseDto[];
  @ApiProperty({ type: [SolvedProblemResponseDto] }) solvedProblems!: SolvedProblemResponseDto[];
}
