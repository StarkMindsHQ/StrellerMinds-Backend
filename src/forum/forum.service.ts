import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thread } from './entities/thread.entity';
import { Comment } from './entities/comment.entity';
import { ReputationEvent } from './entities/reputation-event.entity';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(Thread) private threadRepo: Repository<Thread>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(ReputationEvent) private repRepo: Repository<ReputationEvent>,
  ) {}

  async createThread(dto, userId: string) {
    const thread = this.threadRepo.create({ ...dto, authorId: userId });
    return this.threadRepo.save(thread);
  }

  async getThreads() {
    return this.threadRepo.find({ where: { isDeleted: false } });
  }

  async addComment(threadId: string, dto, userId: string) {
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');

    const path = dto.parentId ? `${dto.parentId}.${Date.now()}` : `${Date.now()}`;

    const comment = this.commentRepo.create({
      contentMarkdown: dto.contentMarkdown,
      authorId: userId,
      parentId: dto.parentId,
      path,
      thread,
    });

    return this.commentRepo.save(comment);
  }

  async vote(userId: string, targetUserId: string, vote: 'up' | 'down') {
    const points = vote === 'up' ? 5 : -2;

    return this.repRepo.save({
      userId: targetUserId,
      type: vote === 'up' ? 'UPVOTE' : 'DOWNVOTE',
      points,
    });
  }
}
