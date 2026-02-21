import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { UserProfile } from './entities/user-profile.entity';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Follow } from './entities/follow.entity';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { ProfileAnalytics } from './entities/profile-analytics.entity';
import { Skill } from './entities/skill.entity';
import { UserSkill } from './entities/user-skill.entity';
import { SkillEndorsement } from './entities/skill-endorsement.entity';
import { SkillAssessment } from './entities/skill-assessment.entity';
import { SkillAssessmentResult } from './entities/skill-assessment-result.entity';
import { PortfolioMedia } from './entities/portfolio-media.entity';
import { UserProfileService } from './services/user-profile.service';
import { PortfolioService } from './services/portfolio.service';
import { AchievementService } from './services/achievement.service';
import { SocialService } from './services/social.service';
import { PrivacyService } from './services/privacy.service';
import { SkillService } from './services/skill.service';
import { RecommendationService } from './services/recommendation.service';
import { UserProfileController } from './controllers/profile.controller';
import { SocialController } from './controllers/social.controller';
import { PrivacyController } from './controllers/privacy.controller';
import { AchievementController } from './controllers/achievement.controller';
import { SkillController } from './controllers/skill.controller';
import { RecommendationController } from './controllers/recommendation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserActivity,
      UserProfile,
      PortfolioItem,
      Badge,
      UserBadge,
      Follow,
      PrivacySettings,
      ProfileAnalytics,
      Skill,
      UserSkill,
      SkillEndorsement,
      SkillAssessment,
      SkillAssessmentResult,
      PortfolioMedia,
    ]),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [
    UserController,
    UserProfileController,
    SocialController,
    PrivacyController,
    AchievementController,
    SkillController,
    RecommendationController,
  ],
  providers: [
    UserService,
    UserProfileService,
    PortfolioService,
    AchievementService,
    SocialService,
    PrivacyService,
    SkillService,
    RecommendationService,
  ],
  exports: [
    UserService,
    UserProfileService,
    PortfolioService,
    AchievementService,
    SocialService,
    PrivacyService,
    SkillService,
    RecommendationService,
  ],
})
export class UserModule {}
