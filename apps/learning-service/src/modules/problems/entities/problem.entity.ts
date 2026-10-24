import type { ProblemType, SupportedLanguage } from '@app/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum Difficulty {
  Easy = 'EASY',
  Medium = 'MEDIUM',
  Hard = 'HARD',
}

export enum PublishStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  OnHold = 'ON_HOLD',
}

export type ProblemTypeConfigJson = {
  languageContract?: Record<string, unknown>;
  ooContract?: Record<string, unknown>;
};

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 80, unique: true }) name!: string;
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 80, unique: true }) name!: string;
}

@Entity('problems')
export class Problem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220 })
  slug!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'problem_type', type: 'varchar', length: 20 }) problemType!: ProblemType;
  @Column({ type: 'enum', enum: Difficulty }) difficulty!: Difficulty;
  @Column({ name: 'input_specification', type: 'text', nullable: true }) inputSpecification!:
    string | null;
  @Column({ name: 'output_specification', type: 'text', nullable: true }) outputSpecification!:
    string | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) examples!: Record<string, unknown>[];
  @Column({ type: 'text', nullable: true }) constraints!: string | null;
  @Column({ name: 'time_limit_ms', type: 'integer', default: 1000 }) timeLimitMs!: number;
  @Column({ name: 'memory_limit_mb', type: 'integer', default: 256 }) memoryLimitMb!: number;
  @Column({
    name: 'publish_status',
    type: 'enum',
    enum: PublishStatus,
    default: PublishStatus.Draft,
  })
  publishStatus!: PublishStatus;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @Column({ name: 'type_config', type: 'jsonb', nullable: true })
  typeConfig!: ProblemTypeConfigJson | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToMany(() => Topic)
  @JoinTable({
    name: 'problem_topics',
    joinColumn: { name: 'problem_id' },
    inverseJoinColumn: { name: 'topic_id' },
  })
  topics!: Topic[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'problem_tags',
    joinColumn: { name: 'problem_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags!: Tag[];

  @OneToMany(() => TestCase, (testCase) => testCase.problem) testCases!: TestCase[];
  @OneToMany(() => StarterCode, (starter) => starter.problem) starterCodes!: StarterCode[];
  @OneToMany(() => ProblemLanguage, (language) => language.problem) languages!: ProblemLanguage[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Problem, (problem) => problem.testCases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem!: Problem;
  @Column({ type: 'text', default: '' }) input!: string;
  @Column({ name: 'expected_output', type: 'text' }) expectedOutput!: string;
  @Column({ name: 'is_hidden', type: 'boolean', default: true }) isHidden!: boolean;
  @Column({ type: 'integer', default: 1 }) score!: number;
  @Column({ name: 'display_order', type: 'integer', default: 0 }) displayOrder!: number;
}

@Entity('starter_codes')
@Unique('uq_starter_codes_problem_language', ['problem', 'language'])
export class StarterCode {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Problem, (problem) => problem.starterCodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem!: Problem;
  @Column({ type: 'varchar', length: 20 }) language!: SupportedLanguage;
  @Column({ name: 'source_code', type: 'text' }) sourceCode!: string;
  @Column({ name: 'hidden_harness', type: 'text', nullable: true, select: false }) hiddenHarness!:
    string | null;
}

@Entity('problem_languages')
export class ProblemLanguage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Problem, (problem) => problem.languages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem!: Problem;
  @Column({ type: 'varchar', length: 20 }) language!: SupportedLanguage;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
}
