import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileService } from './user-profile.service';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileAnalytics } from '../entities/profile-analytics.entity';
import { NotFoundException } from '@nestjs/common';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let profileRepository: Repository<UserProfile>;
  let analyticsRepository: Repository<ProfileAnalytics>;

  const mockProfile = {
    id: 'profile-1',
    userId: 'user-1',
    bio: 'Software Developer',
    headline: 'Full Stack Developer',
    profilePhotoUrl: 'photo.jpg',
    coverPhotoUrl: 'cover.jpg',
    location: 'New York',
    website: 'https://example.com',
    skills: 'JavaScript, TypeScript',
    specialization: 'Web Development',
    yearsOfExperience: 5,
    education: 'Computer Science',
    socialLinks: { twitter: '@user', linkedin: 'user' },
    theme: { primaryColor: '#000', layout: 'grid' },
    showBadges: true,
    showPortfolio: true,
    showActivity: true,
    followersCount: 100,
    followingCount: 50,
    portfolioItemsCount: 10,
    badgesCount: 5,
    profileViews: 1000,
    isVerified: true,
    completionStatus: 'complete',
    completionPercentage: 90,
    portfolioItems: [],
    badges: [],
    privacySettings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnalytics = {
    id: 'analytics-1',
    profileId: 'profile-1',
    totalViews: 1000,
    viewsToday: 10,
    viewsThisWeek: 50,
    viewsThisMonth: 200,
    totalFollowsGained: 100,
    totalFollowsLost: 5,
    portfolioItemsViews: 500,
    portfolioItemsClicks: 100,
    badgesDisplays: 50,
    trafficSources: { direct: 500, search: 300 },
    deviceTypes: { desktop: 600, mobile: 400 },
    topCountries: { US: 500, UK: 200 },
    averageSessionDuration: 120,
    lastViewedAt: new Date(),
    recentViewers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            create: jest.fn().mockReturnValue(mockProfile),
            save: jest.fn().mockResolvedValue(mockProfile),
            findOne: jest.fn().mockResolvedValue(mockProfile),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              relations: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockProfile),
            })),
          },
        },
        {
          provide: getRepositoryToken(ProfileAnalytics),
          useValue: {
            create: jest.fn().mockReturnValue(mockAnalytics),
            save: jest.fn().mockResolvedValue(mockAnalytics),
            findOne: jest.fn().mockResolvedValue(mockAnalytics),
          },
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    profileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
    analyticsRepository = module.get<Repository<ProfileAnalytics>>(
      getRepositoryToken(ProfileAnalytics),
    );
  });

  describe('createProfile', () => {
    it('should create a new profile', async () => {
      const result = await service.createProfile('user-1');

      expect(profileRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        completionPercentage: 0,
        completionStatus: 'incomplete',
      });
      expect(profileRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create associated analytics', async () => {
      await service.createProfile('user-1');

      expect(analyticsRepository.create).toHaveBeenCalled();
      expect(analyticsRepository.save).toHaveBeenCalled();
    });
  });

  describe('getProfileByUserId', () => {
    it('should return profile by user ID', async () => {
      const result = await service.getProfileByUserId('user-1');

      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['portfolioItems', 'badges', 'badges.badge', 'privacySettings'],
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if profile not found', async () => {
      jest.spyOn(profileRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.getProfileByUserId('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and calculate completion', async () => {
      const updateDto = {
        bio: 'Updated bio',
        headline: 'Senior Developer',
      };

      const result = await service.updateProfile('user-1', updateDto);

      expect(profileRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.completionPercentage).toBeDefined();
    });

    it('should calculate completion percentage correctly', async () => {
      const updateDto = {
        bio: 'Bio',
        headline: 'Headline',
        profilePhotoUrl: 'photo.jpg',
        location: 'Location',
        skills: 'Skills',
        specialization: 'Specialization',
        website: 'https://example.com',
        yearsOfExperience: 5,
        education: 'Education',
        socialLinks: { twitter: '@user' },
      };

      const result = await service.updateProfile('user-1', updateDto);

      expect(result.completionPercentage).toBe(100);
      expect(result.completionStatus).toBe('complete');
    });
  });

  describe('getProfileWithDetails', () => {
    it('should return profile with all details', async () => {
      const result = await service.getProfileWithDetails('user-1');

      expect(result).toHaveProperty('portfolioItems');
      expect(result).toHaveProperty('badges');
      expect(result).toHaveProperty('analytics');
    });
  });

  describe('trackProfileView', () => {
    it('should track profile view', async () => {
      await service.trackProfileView('profile-1', 'https://referrer.com');

      expect(profileRepository.save).toHaveBeenCalled();
      expect(analyticsRepository.save).toHaveBeenCalled();
    });

    it('should update analytics correctly', async () => {
      await service.trackProfileView('profile-1');

      expect(analyticsRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics for user', async () => {
      const result = await service.getAnalytics('user-1');

      expect(result).toBeDefined();
      expect(result.totalViews).toBe(mockAnalytics.totalViews);
    });

    it('should throw NotFoundException if analytics not found', async () => {
      jest.spyOn(analyticsRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.getAnalytics('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetDailyStats', () => {
    it('should reset daily stats', async () => {
      await service.resetDailyStats('profile-1');

      expect(analyticsRepository.save).toHaveBeenCalled();
    });
  });
});
