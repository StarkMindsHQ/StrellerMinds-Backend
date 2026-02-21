import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillService } from './skill.service';
import { Skill } from '../entities/skill.entity';
import { UserSkill } from '../entities/user-skill.entity';
import { SkillEndorsement } from '../entities/skill-endorsement.entity';
import { SkillAssessment } from '../entities/skill-assessment.entity';
import { SkillAssessmentResult } from '../entities/skill-assessment-result.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SkillService', () => {
  let service: SkillService;
  let skillRepository: Repository<Skill>;
  let userSkillRepository: Repository<UserSkill>;
  let endorsementRepository: Repository<SkillEndorsement>;
  let assessmentRepository: Repository<SkillAssessment>;
  let assessmentResultRepository: Repository<SkillAssessmentResult>;
  let profileRepository: Repository<UserProfile>;

  const mockSkill = {
    id: 'skill-1',
    name: 'JavaScript',
    description: 'Programming language',
    category: 'technical',
    isActive: true,
    totalEndorsements: 0,
    userCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserSkill = {
    id: 'user-skill-1',
    profileId: 'profile-1',
    skillId: 'skill-1',
    proficiencyLevel: 3,
    yearsOfExperience: 2,
    description: 'Experienced JS developer',
    isPublic: true,
    isVerified: false,
    endorsementCount: 0,
    assessmentScore: 0,
    skill: mockSkill,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillService,
        {
          provide: getRepositoryToken(Skill),
          useValue: {
            create: jest.fn().mockReturnValue(mockSkill),
            save: jest.fn().mockResolvedValue(mockSkill),
            findOne: jest.fn().mockResolvedValue(mockSkill),
            find: jest.fn().mockResolvedValue([mockSkill]),
            findAndCount: jest.fn().mockResolvedValue([[mockSkill], 1]),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[mockSkill], 1]),
            })),
          },
        },
        {
          provide: getRepositoryToken(UserSkill),
          useValue: {
            create: jest.fn().mockReturnValue(mockUserSkill),
            save: jest.fn().mockResolvedValue(mockUserSkill),
            findOne: jest.fn().mockResolvedValue(mockUserSkill),
            find: jest.fn().mockResolvedValue([mockUserSkill]),
            remove: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([mockUserSkill]),
            })),
          },
        },
        {
          provide: getRepositoryToken(SkillEndorsement),
          useValue: {
            create: jest.fn().mockReturnValue({ id: 'endorsement-1' }),
            save: jest.fn().mockResolvedValue({ id: 'endorsement-1' }),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(SkillAssessment),
          useValue: {
            create: jest.fn().mockReturnValue({ id: 'assessment-1' }),
            save: jest.fn().mockResolvedValue({ id: 'assessment-1' }),
            findOne: jest.fn().mockResolvedValue({
              id: 'assessment-1',
              skillId: 'skill-1',
              questions: [
                {
                  id: 'q1',
                  type: 'multiple_choice',
                  question: 'What is JS?',
                  options: ['Language', 'Framework'],
                  correctAnswer: 'Language',
                  points: 10,
                },
              ],
              passingScore: 70,
            }),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(SkillAssessmentResult),
          useValue: {
            create: jest.fn().mockReturnValue({ id: 'result-1' }),
            save: jest.fn().mockResolvedValue({ id: 'result-1' }),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 'profile-1',
              user: { firstName: 'John', lastName: 'Doe' },
              profilePhotoUrl: 'photo.jpg',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SkillService>(SkillService);
    skillRepository = module.get<Repository<Skill>>(getRepositoryToken(Skill));
    userSkillRepository = module.get<Repository<UserSkill>>(getRepositoryToken(UserSkill));
    endorsementRepository = module.get<Repository<SkillEndorsement>>(getRepositoryToken(SkillEndorsement));
    assessmentRepository = module.get<Repository<SkillAssessment>>(getRepositoryToken(SkillAssessment));
    assessmentResultRepository = module.get<Repository<SkillAssessmentResult>>(getRepositoryToken(SkillAssessmentResult));
    profileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));
  });

  describe('createSkill', () => {
    it('should create a new skill', async () => {
      const createDto = {
        name: 'JavaScript',
        description: 'Programming language',
        category: 'technical' as const,
      };

      const result = await service.createSkill(createDto);

      expect(skillRepository.create).toHaveBeenCalledWith(createDto);
      expect(skillRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(mockSkill.name);
    });
  });

  describe('getSkillById', () => {
    it('should return a skill by ID', async () => {
      const result = await service.getSkillById('skill-1');

      expect(skillRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'skill-1' },
      });
      expect(result.id).toBe(mockSkill.id);
    });

    it('should throw NotFoundException if skill not found', async () => {
      jest.spyOn(skillRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.getSkillById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addUserSkill', () => {
    it('should add a skill to user profile', async () => {
      const createDto = {
        skillId: 'skill-1',
        proficiencyLevel: 3,
        yearsOfExperience: 2,
      };

      const result = await service.addUserSkill('profile-1', createDto);

      expect(userSkillRepository.create).toHaveBeenCalledWith({
        ...createDto,
        profileId: 'profile-1',
      });
      expect(result.profileId).toBe('profile-1');
    });

    it('should throw BadRequestException if user already has skill', async () => {
      jest.spyOn(userSkillRepository, 'findOne').mockResolvedValueOnce(mockUserSkill as UserSkill);

      await expect(
        service.addUserSkill('profile-1', { skillId: 'skill-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createEndorsement', () => {
    it('should create a skill endorsement', async () => {
      const createDto = {
        userSkillId: 'user-skill-1',
        weight: 5,
        comment: 'Great developer!',
      };

      const result = await service.createEndorsement('profile-2', createDto);

      expect(endorsementRepository.create).toHaveBeenCalledWith({
        ...createDto,
        endorserId: 'profile-2',
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for self-endorsement', async () => {
      const createDto = {
        userSkillId: 'user-skill-1',
        weight: 5,
      };

      await expect(
        service.createEndorsement('profile-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAssessment', () => {
    it('should submit an assessment and calculate score', async () => {
      const submitDto = {
        assessmentId: 'assessment-1',
        answers: [{ questionId: 'q1', answer: 'Language' }],
        timeTakenMinutes: 10,
      };

      const result = await service.submitAssessment('profile-1', submitDto);

      expect(assessmentResultRepository.create).toHaveBeenCalled();
      expect(result.score).toBeDefined();
      result.isPassed = true;
    });
  });

  describe('getUserSkillStats', () => {
    it('should return user skill statistics', async () => {
      const result = await service.getUserSkillStats('profile-1');

      expect(result).toHaveProperty('totalSkills');
      expect(result).toHaveProperty('verifiedSkills');
      expect(result).toHaveProperty('totalEndorsements');
      expect(result).toHaveProperty('averageProficiency');
      expect(result).toHaveProperty('topSkills');
      expect(result).toHaveProperty('skillsByCategory');
    });
  });
});
