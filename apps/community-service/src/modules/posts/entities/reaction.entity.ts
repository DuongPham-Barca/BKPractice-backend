import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Post } from './post.entity';

export enum ReactionType {
  Like = 'LIKE',
}

@Index(['post', 'userId'], { unique: true })
@Entity('reactions')
export class Reaction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'enum', enum: ReactionType, default: ReactionType.Like }) type!: ReactionType;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
