import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PublishedCourseQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;

  @ApiPropertyOptional({ maxLength: 200, description: 'Case-insensitive title search.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class ManagedCourseQueryDto extends PublishedCourseQueryDto {
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
