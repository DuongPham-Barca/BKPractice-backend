import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('external_identities')
@Index(['provider', 'providerTenantId', 'providerSubjectId'], { unique: true })
@Index(['userId', 'provider'], { unique: true })
export class ExternalIdentity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: 'MICROSOFT';

  @Column({ name: 'provider_tenant_id', type: 'varchar', length: 64 })
  providerTenantId!: string;

  @Column({ name: 'provider_subject_id', type: 'varchar', length: 128 })
  providerSubjectId!: string;

  @Column({ name: 'provider_username_at_link', type: 'varchar', length: 320 })
  providerUsernameAtLink!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
