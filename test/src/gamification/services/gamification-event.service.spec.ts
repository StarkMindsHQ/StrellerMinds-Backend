import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GamificationEventService } from './gamification-event.service';
import { GamificationEvent } from '../entities/gamification-event.entity';

describe('GamificationEventService', () => {
  let service: GamificationEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationEventService,
        { provide: getRepositoryToken(GamificationEvent), useValue: {} },
      ],
    }).compile();

    service = module.get<GamificationEventService>(GamificationEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
}); 