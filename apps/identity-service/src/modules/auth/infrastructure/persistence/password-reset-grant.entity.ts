import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('password_reset_grants')
export class PasswordResetGrant {
  @PrimaryColumn({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index('IDX_password_reset_grants_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('IDX_password_reset_grants_expires_at')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
