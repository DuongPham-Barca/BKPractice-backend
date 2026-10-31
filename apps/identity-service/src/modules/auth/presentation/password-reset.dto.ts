import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SendPasswordResetOtpDto {
  @ApiProperty({ maxLength: 320 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class VerifyPasswordResetOtpDto extends SendPasswordResetOtpDto {
  @ApiProperty({ pattern: '^[0-9]{6}$' })
  @IsString()
  @Matches(/^[0-9]{6}$/)
  otp!: string;
}

export class ResetPasswordWithGrantDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  resetToken!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class PasswordResetTokenResponseDto {
  @ApiProperty() resetToken!: string;
}
