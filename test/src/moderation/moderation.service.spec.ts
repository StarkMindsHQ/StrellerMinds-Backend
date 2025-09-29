/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { ModerationService } from './moderation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModerationLog } from './entities/forum-moderation-logs.entity';
import { Repository } from 'typeorm';

describe('ModerationService', () => {
  let service: ModerationService;
  let repo: Repository<ModerationLog>;

  const mockLog = {
    id: 'log-id',
    action: 'approve',
    entityType: 'post',
    entityId: 'entity-id',
    moderator: { id: 'moderator-id' },
    createdAt: new Date(),
  };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockLog),
    save: jest.fn().mockResolvedValue(mockLog),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: getRepositoryToken(ModerationLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    repo = module.get(getRepositoryToken(ModerationLog));
  });

  it('should log a moderation action', async () => {
    const result = await service.logModerationAction(
      'approve',
      'post',
      'entity-id',
      'moderator-id',
    );
    expect(repo.create).toHaveBeenCalledWith({
      action: 'approve',
      entityType: 'post',
      entityId: 'entity-id',
      moderator: { id: 'moderator-id' },
    });
    expect(repo.save).toHaveBeenCalledWith(mockLog);
    expect(result).toEqual(mockLog);
  });
});
