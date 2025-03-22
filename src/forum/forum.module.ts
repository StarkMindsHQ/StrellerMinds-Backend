import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumCategory } from './entities/forum-category.entity';
import { ForumTopic } from './entities/forum-topic.entity';
import { ForumPost } from './entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumCategory,
      ForumTopic,
      ForumPost,
      ForumComment,
      User
    ])
  ],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [TypeOrmModule]
})
export class ForumModule { }
