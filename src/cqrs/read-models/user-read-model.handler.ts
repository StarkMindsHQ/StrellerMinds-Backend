import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventHandler } from '../decorators/event-handler.decorator';
import { BaseReadModel } from './base-read-model';
import { UserCreatedEvent } from '../../user/events/user-created.event';
import { UserReadModelEntity } from './user-read-model.entity';

@Injectable()
@EventHandler(UserCreatedEvent)
export class UserReadModelHandler extends BaseReadModel<UserCreatedEvent> {
  constructor(
    @InjectRepository(UserReadModelEntity)
    private readonly userReadModelRepository: Repository<UserReadModelEntity>,
  ) {
    super('User');
  }

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.updateReadModel(async () => {
      const existingReadModel = await this.userReadModelRepository.findOne({
        where: { userId: event.data.userId },
      });

      if (!existingReadModel) {
        const readModel = this.userReadModelRepository.create({
          userId: event.data.userId,
          email: event.data.email,
          username: event.data.username,
          role: event.data.role,
          status: 'ACTIVE',
          loginCount: 0,
          courseEnrollments: 0,
          completedCourses: 0,
          totalPoints: 0,
          achievements: [],
        });

        await this.userReadModelRepository.save(readModel);
        this.logger.log(`Created read model for user: ${event.data.userId}`);
      }
    });
  }

  async getUserReadModel(userId: string): Promise<UserReadModelEntity | null> {
    return this.userReadModelRepository.findOne({
      where: { userId },
    });
  }

  async getUserStats(userId: string): Promise<any> {
    const readModel = await this.getUserReadModel(userId);
    if (!readModel) {
      return null;
    }

    return {
      userId: readModel.userId,
      username: readModel.username,
      role: readModel.role,
      loginCount: readModel.loginCount,
      courseEnrollments: readModel.courseEnrollments,
      completedCourses: readModel.completedCourses,
      totalPoints: readModel.totalPoints,
      achievements: readModel.achievements || [],
      lastLoginAt: readModel.lastLoginAt,
    };
  }
}
