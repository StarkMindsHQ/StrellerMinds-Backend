import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryHandler } from '../../cqrs/decorators/query-handler.decorator';
import { IQueryHandler } from '../../cqrs/interfaces/query.interface';
import { GetUserByIdQuery } from '../queries/get-user-by-id.query';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserActivity } from '../entities/user-activity.entity';

@Injectable()
@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserActivity)
    private readonly activityRepository: Repository<UserActivity>,
  ) {}

  async handle(query: GetUserByIdQuery): Promise<any> {
    const { userId, includeProfile, includeActivity } = query.params;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let result: any = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (includeProfile) {
      const profile = await this.profileRepository.findOne({
        where: { userId },
      });
      result.profile = profile;
    }

    if (includeActivity) {
      const activities = await this.activityRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10,
      });
      result.recentActivities = activities;
    }

    return result;
  }
}
