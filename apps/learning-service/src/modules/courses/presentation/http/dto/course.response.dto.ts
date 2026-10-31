import { ApiProperty } from '@nestjs/swagger';

export class ChapterResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ type: [String], description: 'Ordered problem ids.' }) problemIds!: string[];
}

export class CourseResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ON_HOLD'] }) status!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) deletedAt!: string | null;
  @ApiProperty({ type: [ChapterResponseDto] }) chapters!: ChapterResponseDto[];
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class CourseListResponseDto {
  @ApiProperty({ type: [CourseResponseDto] }) items!: CourseResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
