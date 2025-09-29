/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModerationLog } from './entities/forum-moderation-logs.entity';
import { Repository } from 'typeorm';
import { Thread } from 'src/thread/thread.entity';
import { Reply } from 'src/reply/reply.entity';

/**
 * Service for moderation logic: locking threads, reporting/deleting replies, and logging actions.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationLog)
    private moderationLogRepository: Repository<ModerationLog>,
    @InjectRepository(Thread) private threadRepo: Repository<Thread>,
    @InjectRepository(Reply) private replyRepo: Repository<Reply>,
  ) {}

  /**
   * Lock a thread by its ID.
   * @param threadId - The ID of the thread to be locked.
   * @returns The updated thread entity.
   */
  async lockThread(threadId: number) {
    const thread = await this.threadRepo.findOneBy({ id: threadId });
    thread.isOpen = false;
    return this.threadRepo.save(thread);
  }

  /**
   * Report a reply by its ID.
   * @param replyId - The ID of the reply to be reported.
   * @returns The updated reply entity.
   */
  async reportReply(replyId: number) {
    const reply = await this.replyRepo.findOneBy({ id: replyId });
    reply.isReported = true;
    return this.replyRepo.save(reply);
  }

  /**
   * Soft delete a reply by its ID.
   * @param replyId - The ID of the reply to be deleted.
   * @returns The result of the delete operation.
   */
  async deleteReply(replyId: number) {
    return this.replyRepo.softDelete(replyId);
  }

  /**
   * Log a moderation action.
   * @param action - The action performed (e.g., 'lock', 'report', 'delete').
   * @param entityType - The type of entity being moderated (e.g., 'thread', 'reply').
   * @param entityId - The ID of the entity being moderated.
   * @param moderatorId - The ID of the moderator performing the action.
   * @returns The created moderation log entry.
   */
  async logModerationAction(
    action: string,
    entityType: string,
    entityId: string,
    moderatorId: string,
  ): Promise<ModerationLog> {
    const log = this.moderationLogRepository.create({
      action,
      entityType,
      entityId,
      moderator: { id: moderatorId },
    });
    return this.moderationLogRepository.save(log);
  }
}
