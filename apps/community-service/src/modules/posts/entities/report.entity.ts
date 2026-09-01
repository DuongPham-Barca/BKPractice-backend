import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Post } from './post.entity';

export enum ReportStatus {
  Open = 'OPEN',
  Reviewed = 'REVIEWED',
  Dismissed = 'DISMISSED',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;
  @Column({ name: 'reporter_id', type: 'uuid' }) reporterId!: string;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.Open }) status!: ReportStatus;
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true }) reviewedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
