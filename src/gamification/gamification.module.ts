import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationProfile } from './entities/gamification-profile.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Reward } from './entities/reward.entity';
import { Challenge } from './entities/challenge.entity';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { GamificationSeeder } from './gamification-seeder.service';
import { GamificationEventHandlers } from './events/gamification.event-handlers';

@Module({
  imports: [TypeOrmModule.forFeature([GamificationProfile, Badge, UserBadge, Reward, Challenge])],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationSeeder, GamificationEventHandlers],
  exports: [GamificationService],
})
export class GamificationModule {}
