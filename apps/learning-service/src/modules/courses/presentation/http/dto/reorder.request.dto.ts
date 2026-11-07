import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

const MAX_ITEMS = 50;

export class ReorderRequestDto {
  @ApiProperty({ type: [String], description: 'Complete new order; must match the current set.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ITEMS)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  ids!: string[];
}
