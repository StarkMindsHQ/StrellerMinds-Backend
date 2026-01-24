import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { ForumGateway } from './forum.gateway';
import { Thread } from './entities/thread.entity';
import { Comment } from './entities/comment.entity';
import { ReputationEvent } from './entities/reputation-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Thread, Comment, ReputationEvent]),
  ],
  providers: [ForumService, ForumGateway],
  controllers: [ForumController],
})
export class ForumModule {}
