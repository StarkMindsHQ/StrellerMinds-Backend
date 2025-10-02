import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamificationEvent } from '../entities/gamification-event.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class GamificationEventService {
  constructor(
    @InjectRepository(GamificationEvent)
    private eventRepo: Repository<GamificationEvent>,
  ) {}

  async logEvent(user: User, eventType: string, metadata?: any): Promise<GamificationEvent> {
    const event = this.eventRepo.create({ user, eventType, metadata });
    return this.eventRepo.save(event);
  }

  async getEvents(eventType?: string): Promise<GamificationEvent[]> {
    if (eventType) {
      return this.eventRepo.find({ where: { eventType }, relations: ['user'] });
    }
    return this.eventRepo.find({ relations: ['user'] });
  }
}
