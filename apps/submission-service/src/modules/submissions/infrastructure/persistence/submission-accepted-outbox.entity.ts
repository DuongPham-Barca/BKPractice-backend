import type { SubmissionAcceptedEvent } from '@app/contracts';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('submission_accepted_outbox')
export class SubmissionAcceptedOutbox {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId!: string;
  @Column({ name: 'submission_id', type: 'uuid', unique: true }) submissionId!: string;
  @Column({ type: 'jsonb' }) payload!: SubmissionAcceptedEvent;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
}
