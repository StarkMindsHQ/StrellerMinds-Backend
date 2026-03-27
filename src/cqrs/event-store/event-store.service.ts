import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IEvent, IEventStore } from '../interfaces/event.interface';
import { EventEntity } from '../entities/event.entity';

@Injectable()
export class EventStoreService implements IEventStore {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  async saveEvent(event: IEvent): Promise<void> {
    const eventEntity = this.eventRepository.create({
      id: event.aggregateId + '_' + event.version,
      aggregateId: event.aggregateId,
      eventType: event.type,
      eventData: event.data,
      version: event.version,
      timestamp: event.timestamp,
      userId: event.userId,
      metadata: event.metadata,
    });

    await this.eventRepository.save(eventEntity);
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<IEvent[]> {
    const whereCondition: any = { aggregateId };
    if (fromVersion) {
      whereCondition.version = { $gte: fromVersion };
    }

    const eventEntities = await this.eventRepository.find({
      where: whereCondition,
      order: { version: 'ASC' },
    });

    return eventEntities.map(entity => ({
      data: entity.eventData,
      type: entity.eventType,
      aggregateId: entity.aggregateId,
      version: entity.version,
      timestamp: entity.timestamp,
      userId: entity.userId,
      metadata: entity.metadata,
    }));
  }

  async getEventsByType(eventType: string, fromTimestamp?: Date): Promise<IEvent[]> {
    const whereCondition: any = { eventType: eventType };
    if (fromTimestamp) {
      whereCondition.timestamp = { $gte: fromTimestamp };
    }

    const eventEntities = await this.eventRepository.find({
      where: whereCondition,
      order: { timestamp: 'ASC' },
    });

    return eventEntities.map(entity => ({
      data: entity.eventData,
      type: entity.eventType,
      aggregateId: entity.aggregateId,
      version: entity.version,
      timestamp: entity.timestamp,
      userId: entity.userId,
      metadata: entity.metadata,
    }));
  }

  async getLatestVersion(aggregateId: string): Promise<number> {
    const latestEvent = await this.eventRepository.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    return latestEvent ? latestEvent.version : 0;
  }
}
