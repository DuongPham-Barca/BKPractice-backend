import type { CompilerError, SupportedLanguage } from '@app/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

export enum SubmissionKind {
  Run = 'RUN',
  Submit = 'SUBMIT',
}

export enum SubmissionStatus {
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Running = 'RUNNING',
  Accepted = 'ACCEPTED',
  WrongAnswer = 'WRONG_ANSWER',
  CompileError = 'COMPILE_ERROR',
  RuntimeError = 'RUNTIME_ERROR',
  TimeLimitExceeded = 'TIME_LIMIT_EXCEEDED',
  MemoryLimitExceeded = 'MEMORY_LIMIT_EXCEEDED',
  InternalError = 'INTERNAL_ERROR',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
  @Index()
  @Column({ name: 'problem_id', type: 'uuid', nullable: true })
  problemId!: string | null;
  @Column({ type: 'enum', enum: SubmissionKind }) kind!: SubmissionKind;
  @Column({ type: 'varchar', length: 20 }) language!: SupportedLanguage;
  @Column({ name: 'source_code', type: 'text' }) sourceCode!: string;
  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.Pending })
  status!: SubmissionStatus;
  @Column({ type: 'integer', default: 0 }) score!: number;
  @Column({ name: 'passed_tests', type: 'integer', nullable: true }) passedTests!: number | null;
  @Column({ name: 'total_tests', type: 'integer', nullable: true }) totalTests!: number | null;
  @Column({ name: 'runtime_ms', type: 'integer', nullable: true }) runtimeMs!: number | null;
  @Column({ name: 'memory_kb', type: 'integer', nullable: true }) memoryKb!: number | null;
  @Column({ name: 'accepted_event_id', type: 'uuid', nullable: true })
  acceptedEventId!: string | null;
  @Column({ name: 'progress_event_published_at', type: 'timestamptz', nullable: true })
  progressEventPublishedAt!: Date | null;
  @OneToOne(() => SubmissionResult, (result) => result.submission)
  result?: Relation<SubmissionResult>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('submission_results')
export class SubmissionResult {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @OneToOne(() => Submission, (submission) => submission.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission!: Relation<Submission>;
  @Column({ type: 'text', nullable: true }) stdout!: string | null;
  @Column({ type: 'text', nullable: true }) stderr!: string | null;
  @Column({ name: 'compile_output', type: 'text', nullable: true }) compileOutput!: string | null;
  @Column({ type: 'jsonb', nullable: true }) error!: CompilerError | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
