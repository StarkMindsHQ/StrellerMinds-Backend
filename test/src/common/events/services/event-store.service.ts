import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { DomainEvent } from '../base/domain-event.base';
import { 
  IEventStore, 
  EventStoreRecord, 
  EventStream, 
  EventStoreQuery, 
  EventStoreOptions 
} from '../interfaces/event-store.interface';
import { EventStoreRecordEntity } from '../entities/event-store-record.entity';
import { AggregateSnapshotEntity } from '../entities/aggregate-snapshot.entity';

@Injectable()
export class EventStoreService implements IEventStore {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    @InjectRepository(EventStoreRecordEntity)
    private readonly eventRepository: Repository<EventStoreRecordEntity>,
    @InjectRepository(AggregateSnapshotEntity)
    private readonly snapshotRepository: Repository<AggregateSnapshotEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    options?: EventStoreOptions,
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check expected version if provided
      if (options?.expectedVersion !== undefined) {
        const currentVersion = await this.getAggregateVersionWithQueryRunner(
          queryRunner,
          aggregateId,
          aggregateType,
        );
        
        if (currentVersion !== options.expectedVersion) {
          throw new Error(
            `Concurrency conflict: Expected version ${options.expectedVersion}, but current version is ${currentVersion}`
          );
        }
      }

      // Create event records
      const eventRecords = events.map(event => {
        const record = new EventStoreRecordEntity();
        record.eventId = event.eventId;
        record.eventType = event.eventType;
        record.aggregateId = aggregateId;
        record.aggregateType = aggregateType;
        record.eventVersion = event.eventVersion;
        record.eventData = event.getPayload();
        record.metadata = event.metadata;
        record.correlationId = options?.correlationId || event.metadata.correlationId;
        record.causationId = options?.causationId || event.metadata.causationId;
        return record;
      });

      // Save events
      await queryRunner.manager.save(EventStoreRecordEntity, eventRecords);

      await queryRunner.commitTransaction();

      this.logger.debug(`Appended ${events.length} events for aggregate ${aggregateType}:${aggregateId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to append events for aggregate ${aggregateType}:${aggregateId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<EventStoreRecord[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .andWhere('event.aggregateType = :aggregateType', { aggregateType })
      .orderBy('event.eventVersion', 'ASC');

    if (fromVersion !== undefined) {
      queryBuilder.andWhere('event.eventVersion >= :fromVersion', { fromVersion });
    }

    const entities = await queryBuilder.getMany();
    return entities.map(this.mapEntityToRecord);
  }

  async getEventStream(aggregateId: string, aggregateType: string): Promise<EventStream> {
    const events = await this.getEvents(aggregateId, aggregateType);
    const version = events.length > 0 ? Math.max(...events.map(e => e.eventVersion)) : 0;

    return {
      aggregateId,
      aggregateType,
      events,
      version,
    };
  }

  async queryEvents(query: EventStoreQuery): Promise<EventStoreRecord[]> {
    const queryBuilder = this.eventRepository.createQueryBuilder('event');

    if (query.aggregateId) {
      queryBuilder.andWhere('event.aggregateId = :aggregateId', { aggregateId: query.aggregateId });
    }

    if (query.aggregateType) {
      queryBuilder.andWhere('event.aggregateType = :aggregateType', { aggregateType: query.aggregateType });
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      queryBuilder.andWhere('event.eventType IN (:...eventTypes)', { eventTypes: query.eventTypes });
    }

    if (query.fromVersion !== undefined) {
      queryBuilder.andWhere('event.eventVersion >= :fromVersion', { fromVersion: query.fromVersion });
    }

    if (query.toVersion !== undefined) {
      queryBuilder.andWhere('event.eventVersion <= :toVersion', { toVersion: query.toVersion });
    }

    if (query.fromTimestamp) {
      queryBuilder.andWhere('event.timestamp >= :fromTimestamp', { fromTimestamp: query.fromTimestamp });
    }

    if (query.toTimestamp) {
      queryBuilder.andWhere('event.timestamp <= :toTimestamp', { toTimestamp: query.toTimestamp });
    }

    queryBuilder.orderBy('event.position', 'ASC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    const entities = await queryBuilder.getMany();
    return entities.map(this.mapEntityToRecord);
  }

  async getAllEvents(fromPosition?: number, limit?: number): Promise<EventStoreRecord[]> {
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .orderBy('event.position', 'ASC');

    if (fromPosition !== undefined) {
      queryBuilder.where('event.position >= :fromPosition', { fromPosition });
    }

    if (limit) {
      queryBuilder.limit(limit);
    }

    const entities = await queryBuilder.getMany();
    return entities.map(this.mapEntityToRecord);
  }

  async getAggregateVersion(aggregateId: string, aggregateType: string): Promise<number> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('MAX(event.eventVersion)', 'maxVersion')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .andWhere('event.aggregateType = :aggregateType', { aggregateType })
      .getRawOne();

    return result?.maxVersion || 0;
  }

  async aggregateExists(aggregateId: string, aggregateType: string): Promise<boolean> {
    const count = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .andWhere('event.aggregateType = :aggregateType', { aggregateType })
      .getCount();

    return count > 0;
  }

  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: any,
  ): Promise<void> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { aggregateId, aggregateType },
    });

    if (snapshot) {
      snapshot.version = version;
      snapshot.snapshotData = data;
      await this.snapshotRepository.save(snapshot);
    } else {
      const newSnapshot = this.snapshotRepository.create({
        aggregateId,
        aggregateType,
        version,
        snapshotData: data,
      });
      await this.snapshotRepository.save(newSnapshot);
    }

    this.logger.debug(`Created snapshot for aggregate ${aggregateType}:${aggregateId} at version ${version}`);
  }

  async getSnapshot(
    aggregateId: string,
    aggregateType: string,
  ): Promise<{ version: number; data: any } | null> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { aggregateId, aggregateType },
    });

    if (!snapshot) {
      return null;
    }

    return {
      version: snapshot.version,
      data: snapshot.snapshotData,
    };
  }

  private async getAggregateVersionWithQueryRunner(
    queryRunner: QueryRunner,
    aggregateId: string,
    aggregateType: string,
  ): Promise<number> {
    const result = await queryRunner.manager
      .createQueryBuilder(EventStoreRecordEntity, 'event')
      .select('MAX(event.eventVersion)', 'maxVersion')
      .where('event.aggregateId = :aggregateId', { aggregateId })
      .andWhere('event.aggregateType = :aggregateType', { aggregateType })
      .getRawOne();

    return result?.maxVersion || 0;
  }

  private mapEntityToRecord(entity: EventStoreRecordEntity): EventStoreRecord {
    return {
      eventId: entity.eventId,
      eventType: entity.eventType,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      eventVersion: entity.eventVersion,
      eventData: entity.eventData,
      metadata: entity.metadata,
      timestamp: entity.timestamp,
      position: entity.position,
    };
  }
}
