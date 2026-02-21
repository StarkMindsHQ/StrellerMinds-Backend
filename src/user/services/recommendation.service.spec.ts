import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { UserProfile } from '../entities/user-profile.entity';
import { UserSkill } from '../entities/user-skill.entity';
import { Follow } from '../entities/follow.entity';
import { PrivacySettings } from '../entities/privacy-settings.entity';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let profileRepository: Repository<UserProfile>;
  let userSkillRepository: Repository<UserSkill>;
  let followRepository: Repository<Follow>;
  let privacyRepository: Repository<PrivacySettings>;

  const mockProfile = {
    id: 'profile-1',
    userId: 'user-1',
    headline: 'Software Developer',
    bio: 'Full-stack developer',
    profilePhotoUrl: 'photo.jpg',
    profileViews: 100,
    followersCount: 50,
    isVerified: true,
    completionPercentage: 90,
    userSkills: [
      { skillId: 'skill-1', skill: { name: 'JavaScript' } },
      { skillId: 'skill-2', skill: { name: 'TypeScript' } },
    ],
  };

  const mockCandidateProfile = {
    id: 'profile-2',
    userId: 'user-2',
    user: { firstName: 'Jane', lastName: 'Smith' },
    headline: 'Frontend Developer',
    bio: 'React specialist',
    profilePhotoUrl: 'photo2.jpg',
    profileViews: 200,
    followersCount: 100,
    isVerified: true,
    completionPercentage: 85,
    userSkills: [
      { skillId: 'skill-1', skill: { name: 'JavaScript' } },
      { skillId: 'skill-3', skill: { name: 'React' } },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockProfile),
            find: jest.fn().mockResolvedValue([mockCandidateProfile]),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([mockCandidateProfile]),
            })),
          },
        },
        {
          provide: getRepositoryToken(UserSkill),
          useValue: {
            find: jest.fn().mockResolvedValue(mockProfile.userSkills),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              having: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([
                { profileId: 'profile-2', skillOverlap: 1 },
              ]),
            })),
          },
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(PrivacySettings),
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                profileId: 'profile-2',
                profileVisibility: 'public',
                showInRecommendations: true,
              },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    profileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
    userSkillRepository = module.get<Repository<UserSkill>>(getRepositoryToken(UserSkill));
    followRepository = module.get<Repository<Follow>>(getRepositoryToken(Follow));
    privacyRepository = module.get<Repository<PrivacySettings>>(getRepositoryToken(PrivacySettings));
  });

  describe('getProfileRecommendations', () => {
    it('should return profile recommendations', async () => {
      const result = await service.getProfileRecommendations('profile-1', 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('profileId');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('reason');
    });

    it('should return empty array if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValueOnce(null);

      const result = await service.getProfileRecommendations('invalid-id', 10);

      expect(result).toEqual([]);
    });

    it('should calculate skill overlap correctly', async () => {
      const result = await service.getProfileRecommendations('profile-1', 10);

      expect(result[0].skillOverlap).toBeDefined();
    });
  });

  describe('getTrendingProfiles', () => {
    it('should return trending profiles', async () => {
      const result = await service.getTrendingProfiles(10);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('profileId');
        expect(result[0]).toHaveProperty('score');
        expect(result[0].reason).toBe('Trending profile');
      }
    });
  });

  describe('getPeopleYouMayKnow', () => {
    it('should return people you may know', async () => {
      const result = await service.getPeopleYouMayKnow('profile-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return popular profiles if no connections', async () => {
      jest.spyOn(followRepository, 'find').mockResolvedValueOnce([]);

      const result = await service.getPeopleYouMayKnow('profile-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getContentRecommendations', () => {
    it('should return content recommendations', async () => {
      const result = await service.getContentRecommendations('profile-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValueOnce(null);

      const result = await service.getContentRecommendations('invalid-id', 10);

      expect(result).toEqual([]);
    });
  });
});
