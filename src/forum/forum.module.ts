import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumCategory } from '../catogory/entities/forum-category.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { User } from '../users/entities/user.entity';
import { PostVote } from '../post/entities/forum-post-vote.entity';
import { PostReaction } from '../post/entities/forum-post-reaction.entity';
import { CommentVote } from './entities/forum-comment-vote.entity';
import { CommentReaction } from './entities/forum-comment-reaction.entity';
import { ForumsController } from './forum.controller';
import { ForumsService } from './forum.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit/audit.log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumCategory,
      ForumTopic,
      ForumPost,
      ForumComment,
      User,
      PostVote,
      PostReaction,
      CommentVote,
      CommentReaction,
    ]),
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [ForumsController],
  providers: [ForumsService],
  exports: [TypeOrmModule],
})
export class ForumModule {}
