import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumCategory } from '../catogory/entities/forum-category.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { User } from '../users/entities/user.entity';
import { ForumsController } from './forum.controller';
import { ForumsService } from './forum.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumCategory,
      ForumTopic,
      ForumPost,
      ForumComment,
      User,
    ]),
  ],
  controllers: [ForumsController],
  providers: [ForumsService],
  exports: [TypeOrmModule],
})
export class ForumModule {}
