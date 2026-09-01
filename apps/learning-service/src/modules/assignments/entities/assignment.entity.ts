import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Classroom, Course } from '../../courses/entities/course.entity';
import { Problem } from '../../problems/entities/problem.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course!: Course | null;
  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classroom!: Classroom | null;
  @Column({ name: 'lecturer_id', type: 'uuid' }) lecturerId!: string;
  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true }) startsAt!: Date | null;
  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true }) deadlineAt!: Date | null;
}

@Index(['assignment', 'problem'], { unique: true })
@Entity('assignment_problems')
export class AssignmentProblem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: Assignment;
  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem!: Problem;
  @Column({ name: 'max_score', type: 'integer', default: 100 }) maxScore!: number;
  @Column({ name: 'display_order', type: 'integer', default: 0 }) displayOrder!: number;
}
