import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserPersistenceEntity } from '../user/infrastructure/persistence/user-persistence.entity';

export interface RetentionPolicy {
  entityName: string;
  retentionDays: number;
  description: string;
}

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  private readonly policies: RetentionPolicy[] = [
    {
      entityName: 'inactive_users',
      retentionDays: 365,
      description: 'Inactive user accounts older than 1 year are deleted',
    },
  ];

  constructor(
    @InjectRepository(UserPersistenceEntity)
    private readonly userRepository: Repository<UserPersistenceEntity>,
  ) {}

  getPolicies(): RetentionPolicy[] {
    return this.policies;
  }

  async applyRetentionPolicies(): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    const result = await this.userRepository.delete({
      isActive: false,
      updatedAt: LessThan(cutoffDate),
    });

    const deleted = result.affected ?? 0;
    this.logger.log(`Retention policy applied: removed ${deleted} inactive users`);
    return { deleted };
  }
}
