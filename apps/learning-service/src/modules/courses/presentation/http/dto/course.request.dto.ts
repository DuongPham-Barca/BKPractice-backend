import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const MAX_ITEMS = 50;

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

export class UpdateCourseRequestDto {
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

export class AddProblemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  problemId!: string;
}

export class ReorderRequestDto {
  @ApiProperty({ type: [String], description: 'Complete new order; must match the current set.' })
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  orderedIds!: string[];
}

export class PublishedCourseQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ maxLength: 200, description: 'Case-insensitive title search.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class ManagedCourseQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted = false;
}

export class IncludeDeletedQueryDto {
  @ApiPropertyOptional({ default: false })
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted = false;
}
