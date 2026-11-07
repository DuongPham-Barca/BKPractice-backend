import { PostScope } from '@community/modules/posts/entities/post.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

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
