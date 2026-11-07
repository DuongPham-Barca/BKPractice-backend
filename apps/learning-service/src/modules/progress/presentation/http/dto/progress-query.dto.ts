import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class SolvedStatusQueryDto {
  @ApiProperty({
    type: String,
    description: 'Comma-separated unique Problem UUIDs, between 1 and 100.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((id) => id.trim().toLowerCase()) : undefined,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  problemIds!: string[];
}
export class NoProgressQueryDto {}
