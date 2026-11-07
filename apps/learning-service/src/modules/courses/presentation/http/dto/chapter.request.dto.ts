import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddChapterRequestDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ minimum: 0, description: 'Insert position; defaults to the end.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateChapterRequestDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  description?: string | null;
}

export class AttachProblemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  problemId!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Insert position; defaults to the end.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
