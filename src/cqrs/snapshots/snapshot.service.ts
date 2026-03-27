import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SnapshotEntity } from '../entities/snapshot.entity';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    @InjectRepository(SnapshotEntity)
    private readonly snapshotRepository: Repository<SnapshotEntity>,
  ) {}

  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    data: any,
    version: number
  ): Promise<void> {
    const snapshot = this.snapshotRepository.create({
      aggregateId,
      aggregateType,
      data,
      version,
      timestamp: new Date(),
    });

    await this.snapshotRepository.save(snapshot);
    this.logger.log(`Created snapshot for ${aggregateType} ${aggregateId} at version ${version}`);
  }

  async getLatestSnapshot(
    aggregateId: string,
    aggregateType: string
  ): Promise<SnapshotEntity | null> {
    return this.snapshotRepository.findOne({
      where: { aggregateId, aggregateType },
      order: { version: 'DESC' },
    });
  }

  async getSnapshotsSince(
    aggregateId: string,
    aggregateType: string,
    fromVersion: number
  ): Promise<SnapshotEntity[]> {
    return this.snapshotRepository.find({
      where: { 
        aggregateId, 
        aggregateType,
        version: { $gte: fromVersion }
      },
      order: { version: 'ASC' },
    });
  }

  async deleteOldSnapshots(
    aggregateId: string,
    aggregateType: string,
    keepLastN: number = 10
  ): Promise<void> {
    const snapshots = await this.snapshotRepository.find({
      where: { aggregateId, aggregateType },
      order: { version: 'DESC' },
    });

    if (snapshots.length > keepLastN) {
      const toDelete = snapshots.slice(keepLastN);
      await this.snapshotRepository.remove(toDelete);
      this.logger.log(`Deleted ${toDelete.length} old snapshots for ${aggregateType} ${aggregateId}`);
    }
  }
}
