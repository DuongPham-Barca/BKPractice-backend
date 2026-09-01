import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
