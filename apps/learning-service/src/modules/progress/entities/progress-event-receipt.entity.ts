import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('progress_event_receipts')
export class ProgressEventReceipt {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'problem_id', type: 'uuid' }) problemId!: string;
  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' }) receivedAt!: Date;
}
