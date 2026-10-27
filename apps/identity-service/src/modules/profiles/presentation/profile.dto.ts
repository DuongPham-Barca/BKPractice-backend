import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description:
      'Omit to keep the current avatar, or send null to clear it; a new value is an approved R2 reference.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  avatar?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 1000,
    description: 'Omit to keep the current bio, or send null to clear it.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
}

export class AvatarUploadIntentDto {
  @ApiProperty({ example: 'image/png' })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 100000 })
  @IsInt()
  @Min(1)
  @Max(52428800)
  size!: number;
}

export class ProfileResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true, description: 'Short-lived signed R2 read URL' }) avatar!:
    string | null;
  @ApiProperty({ nullable: true }) bio!: string | null;
}

export class PublicProfileResponseDto {
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true, description: 'Short-lived signed R2 read URL' }) avatar!:
    string | null;
  @ApiProperty({ nullable: true }) bio!: string | null;
}

export class AvatarUploadIntentResponseDto {
  @ApiProperty({ description: 'Opaque R2 reference to submit in a profile PATCH' }) avatar!: string;
  @ApiProperty({ description: 'Short-lived signed R2 upload URL' }) uploadUrl!: string;
  @ApiProperty() expiresInSeconds!: number;
  @ApiProperty() headers!: Record<string, string>;
}
