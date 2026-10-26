import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class PasswordLoginDto {
  @ApiPropertyOptional({
    maxLength: 64,
    description: 'Student MSSV; provide exactly one of studentId or email',
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(64)
  studentId?: string;

  @ApiPropertyOptional({
    maxLength: 320,
    description: 'Lecturer email; mutually exclusive with studentId',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsEmail()
  @MaxLength(320)
  email?: string;

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

  @ApiPropertyOptional({ description: 'Required for mobile Microsoft PKCE exchange' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  codeVerifier?: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Mobile only; web uses the HttpOnly refresh cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  refreshToken?: string;
}

export class TokenPairResponseDto {
  @ApiPropertyOptional({ description: 'Mobile only' }) accessToken?: string;
  @ApiPropertyOptional({ description: 'Mobile only' }) refreshToken?: string;
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
