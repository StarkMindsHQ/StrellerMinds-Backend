import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserActivity, ActivityType } from '../../../user/entities/user-activity.entity';
import { BaseRepository } from '../../base/base.repository';
import { Repository as RepoDecorator, Cacheable, CacheInvalidate } from '../../decorators/repository.decorators';
import { UnitOfWork } from '../../unit-of-work/unit-of-work';

export interface IUserActivityRepository extends Repository<UserActivity> {
  findByUserId(userId: string, limit?: number): Promise<UserActivity[]>;
  findByActivityType(type: ActivityType, limit?: number): Promise<UserActivity[]>;
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<UserActivity[]>;
  findRecentActivities(userId: string, hours: number): Promise<UserActivity[]>;
  countByUserId(userId: string): Promise<number>;
  countByActivityType(type: ActivityType): Promise<number>;
  logActivity(activity: Partial<UserActivity>): Promise<UserActivity>;
  bulkLogActivities(activities: Partial<UserActivity>[]): Promise<UserActivity[]>;
}

@Injectable()
@RepoDecorator({ entity: UserActivity, cacheable: true, cacheDuration: 300 })
export class UserActivityRepository extends BaseRepository<UserActivity> implements IUserActivityRepository {
  constructor(
    repository: Repository<UserActivity>,
    private readonly unitOfWork: UnitOfWork,
  ) {
    super(repository);
  }

  @Cacheable(300)
  async findByUserId(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return this.findMany({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @Cacheable(300)
  async findByActivityType(type: ActivityType, limit: number = 100): Promise<UserActivity[]> {
    return this.findMany({
      where: { type },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @Cacheable(600)
  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<UserActivity[]> {
    return this.findMany({
      where: {
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  @Cacheable(300)
  async findRecentActivities(userId: string, hours: number = 24): Promise<UserActivity[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.findMany({
      where: {
        userId,
        createdAt: {
          $gte: startDate,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  @Cacheable(300)
  async countByUserId(userId: string): Promise<number> {
    return this.count({ where: { userId } });
  }

  @Cacheable(300)
  async countByActivityType(type: ActivityType): Promise<number> {
    return this.count({ where: { type } });
  }

  @CacheInvalidate('UserActivityRepository:*')
  async logActivity(activity: Partial<UserActivity>): Promise<UserActivity> {
    const newActivity = this.create(activity);
    return this.save(newActivity);
  }

  @CacheInvalidate('UserActivityRepository:*')
  async bulkLogActivities(activities: Partial<UserActivity>[]): Promise<UserActivity[]> {
    const newActivities = activities.map(activity => this.create(activity));
    return this.saveMany(newActivities);
  }

  // Advanced analytics methods
  async getActivityStats(userId: string, days: number = 30): Promise<{
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    dailyActivityCounts: Array<{ date: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.findMany({
      where: {
        userId,
        createdAt: {
          $gte: startDate,
        },
      },
      order: { createdAt: 'ASC' },
    });

    // Group by type
    const activitiesByType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<ActivityType, number>);

    // Group by day
    const dailyActivityCounts = activities.reduce((acc, activity) => {
      const date = activity.createdAt.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as Array<{ date: string; count: number }>);

    return {
      totalActivities: activities.length,
      activitiesByType,
      dailyActivityCounts,
    };
  }

  async getTopActivities(limit: number = 10): Promise<{
    type: ActivityType;
    count: number;
  }[]> {
    const qb = this.createQueryBuilder('activity');
    
    const result = await qb
      .select('activity.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('activity.type')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(item => ({
      type: item.type,
      count: parseInt(item.count, 10),
    }));
  }
}
