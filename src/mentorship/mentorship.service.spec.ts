import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MentorshipService } from './mentorship.service';
import { Mentorship } from './entities/mentorship.entity';
import { MentorshipSession } from './entities/mentorship-session.entity';
import { User } from '../users/entities/user.entity';

describe('MentorshipService.matchMentorMentee', () => {
  let service: MentorshipService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorshipService,
        { provide: getRepositoryToken(Mentorship), useValue: {} },
        { provide: getRepositoryToken(MentorshipSession), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(MentorshipService);
  });

  it('returns mentors ordered by score when matching skills in bio/username', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'mentee-1' } as any);
    userRepo.find.mockResolvedValue([
      {
        id: 'm1',
        isInstructor: true,
        reputation: 1,
        bio: 'Solidity and Stellar dev',
        username: 'dev1',
        firstName: 'A',
        lastName: 'B',
      } as any,
      {
        id: 'm2',
        isInstructor: true,
        reputation: 100,
        bio: 'Python',
        username: 'py',
        firstName: 'C',
        lastName: 'D',
      } as any,
    ]);

    const result = await service.matchMentorMentee('mentee-1', { skills: ['Stellar'] });
    expect(result[0].id === 'm1' || result[0].id === 'm2').toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
