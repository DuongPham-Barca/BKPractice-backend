import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '@/modules/rbac/infrastructure/persistence';

export enum AccountStatus {
  Active = 'ACTIVE',
  Locked = 'LOCKED',
  Pending = 'PENDING',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'student_id', type: 'varchar', length: 64, nullable: true })
  studentId!: string | null;

  @Column({ name: 'official_name', type: 'varchar', length: 100, nullable: true })
  officialName!: string | null;

  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.Active })
  status!: AccountStatus;

  @Column({ name: 'is_system_account', type: 'boolean', default: false })
  isSystemAccount!: boolean;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
