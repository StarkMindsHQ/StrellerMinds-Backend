import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModerationLog } from './entities/forum-moderation-logs.entity';
import { Repository } from 'typeorm';

// Moderation Service
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationLog)
    private moderationLogRepository: Repository<ModerationLog>,
  ) {}

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
