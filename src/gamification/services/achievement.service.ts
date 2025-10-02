import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from '../entities/achievement.entity';
import { UserAchievement } from '../entities/user-achievement.entity';
import { User } from '../../users/entities/user.entity';
import { CreateAchievementDto } from '../dto/create-achievement.dto';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepo: Repository<UserAchievement>,
  ) {}

  async createAchievement(dto: CreateAchievementDto): Promise<Achievement> {
    const achievement = this.achievementRepo.create(dto);
    return this.achievementRepo.save(achievement);
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return this.achievementRepo.find();
  }

  async unlockAchievement(user: User, achievementId: number): Promise<UserAchievement> {
    const achievement = await this.achievementRepo.findOneBy({ id: achievementId });
    if (!achievement) throw new NotFoundException('Achievement not found');
    let userAchievement = await this.userAchievementRepo.findOne({
      where: { user: { id: user.id }, achievement: { id: achievementId } },
    });
    if (!userAchievement) {
      userAchievement = this.userAchievementRepo.create({ user, achievement });
      await this.userAchievementRepo.save(userAchievement);
    }
    return userAchievement;
  }

  async getUserAchievements(user: User): Promise<UserAchievement[]> {
    return this.userAchievementRepo.find({
      where: { user: { id: user.id } },
      relations: ['achievement'],
    });
  }
}
