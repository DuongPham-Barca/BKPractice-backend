import { Bookmark } from './posts/entities/bookmark.entity';
import { Comment } from './posts/entities/comment.entity';
import { Post } from './posts/entities/post.entity';
import { Reaction } from './posts/entities/reaction.entity';
import { Report } from './posts/entities/report.entity';

export const communityEntities = [Post, Comment, Reaction, Bookmark, Report];
