import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

import { PostScope } from '../entities/post.entity';

export class CreatePostDto {
  @ApiProperty({ enum: PostScope })
  @IsEnum(PostScope)
  scope!: PostScope;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @ApiProperty({ required: false })
  @ValidateIf((dto: CreatePostDto) => dto.scope === PostScope.Problem)
  @IsUUID()
  problemId?: string;

  @ApiProperty({ required: false })
  @ValidateIf((dto: CreatePostDto) => dto.scope === PostScope.Course)
  @IsUUID()
  courseId?: string;
}
