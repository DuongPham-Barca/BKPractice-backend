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

@Index(['post', 'userId'], { unique: true })
@Entity('bookmarks')
export class Bookmark {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
