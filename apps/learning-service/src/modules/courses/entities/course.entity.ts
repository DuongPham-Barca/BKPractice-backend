import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220 })
  slug!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ name: 'display_order', type: 'integer', default: 0 }) displayOrder!: number;
}

@Entity('classes')
export class Classroom {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course;
  @Index({ unique: true })
  @Column({ name: 'join_code', type: 'varchar', length: 32 })
  joinCode!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ name: 'lecturer_id', type: 'uuid' }) lecturerId!: string;
}

@Index(['classroom', 'studentId'], { unique: true })
@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classroom!: Classroom;
  @Column({ name: 'student_id', type: 'uuid' }) studentId!: string;
  @CreateDateColumn({ name: 'enrolled_at', type: 'timestamptz' }) enrolledAt!: Date;
}
