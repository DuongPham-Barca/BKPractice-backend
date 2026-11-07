import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCourseRequestDto {
  @ApiProperty({ maxLength: 220, description: 'Unique, immutable after creation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  slug!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Restricted Markdown.' })
  @IsOptional()
  @IsString()
  description?: string | null;
}
