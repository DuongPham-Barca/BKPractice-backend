import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sessions')
export class AuthSession {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255 })
  refreshTokenHash!: string;

  @Column({ name: 'client_type', type: 'varchar', length: 16 })
  clientType!: 'web' | 'mobile';

  @Column({ name: 'device', type: 'varchar', length: 255, nullable: true })
  device!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
