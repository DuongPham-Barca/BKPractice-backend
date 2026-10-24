import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class StudentLoginDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(64)
  studentId!: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class MicrosoftCallbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  state?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  error_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  client_info?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  session_state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  clientdata?: string;
}

export class MicrosoftExchangeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  loginCode!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  refreshToken!: string;
}

export class TokenPairResponseDto {
  @ApiProperty() refreshToken!: string;
}

export class AuthenticatedResponseDto extends TokenPairResponseDto {
  @ApiProperty() userId!: string;
}

export class CurrentAuthUserResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty({ nullable: true }) studentId!: string | null;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'PENDING'] }) status!: string;
}
