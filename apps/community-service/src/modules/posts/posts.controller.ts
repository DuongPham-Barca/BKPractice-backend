import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@ApiTags('community')
@Controller('api/community/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list() {
    return this.posts.list();
  }

  @Post()
  create(@Headers('x-auth-user-id') userId: string, @Body() dto: CreatePostDto) {
    return this.posts.create(userId, dto);
  }

  @Post(':id/comments')
  comment(
    @Headers('x-auth-user-id') userId: string,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.posts.comment(userId, postId, dto);
  }

  @Post(':id/reactions/like')
  like(@Headers('x-auth-user-id') userId: string, @Param('id') postId: string) {
    return this.posts.toggleLike(userId, postId);
  }
}
