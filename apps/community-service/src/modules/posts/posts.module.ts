import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Bookmark } from './entities/bookmark.entity';
import { Comment } from './entities/comment.entity';
import { Post } from './entities/post.entity';
import { Reaction } from './entities/reaction.entity';
import { Report } from './entities/report.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, Reaction, Bookmark, Report])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
