import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardEntry } from '../entities/leaderboard-entry.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardEntry)
    private leaderboardRepo: Repository<LeaderboardEntry>,
  ) {}

  async getLeaderboard(period: string, limit = 10): Promise<LeaderboardEntry[]> {
    return this.leaderboardRepo.find({
      where: { period },
      order: { score: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async updateScore(user: User, period: string, score: number): Promise<LeaderboardEntry> {
    let entry = await this.leaderboardRepo.findOne({ where: { user: { id: user.id }, period } });
    if (!entry) {
      entry = this.leaderboardRepo.create({ user, period, score, rank: 0 });
    } else {
      entry.score = score;
    }
    await this.leaderboardRepo.save(entry);
    // Optionally, recalculate ranks here
    return entry;
  }
} 