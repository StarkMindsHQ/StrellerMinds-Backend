/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from 'src/topic/topic.entity';
import { Thread } from 'src/thread/thread.entity';
import { Reply } from 'src/reply/reply.entity';
import { User } from '../users/entities/user.entity';
import { ModerationService } from 'src/moderation/moderation.service';
import { ReputationService } from 'src/reputation/reputation.service';
import { ForumGateway } from './forum.gateway';
import { ForumAnalyticsService } from './forum-analytics';

/**
 * ForumModule provides forum analytics, real-time events, and moderation features.
 *
 * @module Forum
 */
@Module({
  imports: [TypeOrmModule.forFeature([Topic, Thread, Reply, User])],
  providers: [ModerationService, ReputationService, ForumGateway, ForumAnalyticsService],
  controllers: [],
})
export class ForumModule {}
