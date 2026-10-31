import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('password_reset_challenges')
export class PasswordResetChallenge {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'otp_hash', type: 'varchar', length: 64, nullable: true })
  otpHash!: string | null;

  @Index('IDX_password_reset_challenges_expires_at')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'resend_at', type: 'timestamptz' })
  resendAt!: Date;

  @Column({ name: 'failed_attempts', type: 'integer', default: 0 })
  failedAttempts!: number;
}
