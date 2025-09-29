/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thread } from 'src/thread/thread.entity';
import { Reply } from 'src/reply/reply.entity';

/**
 * ForumAnalyticsService provides analytics for forum threads and replies.
 */
@Injectable()
export class ForumAnalyticsService {
  constructor(
    @InjectRepository(Thread) private threadRepo: Repository<Thread>,
    @InjectRepository(Reply) private replyRepo: Repository<Reply>,
  ) {}

  /**
   * Get statistics for total threads and replies.
   * @returns Object with totalThreads and totalReplies
   */
  async getStats() {
    const threadCount = await this.threadRepo.count();
    const replyCount = await this.replyRepo.count();
    return {
      totalThreads: threadCount,
      totalReplies: replyCount,
    };
  }
}
