import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentManagementService } from './content-management.service';
import { ContentFormat } from '../enums/content-format.enum';

describe('ContentManagementService', () => {
  let service: ContentManagementService;
  let lessonRepo: any;
  let contentRepo: any;
  let versionRepo: any;
  let templateRepo: any;

  beforeEach(() => {
    lessonRepo = { findOneBy: jest.fn() };
    contentRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    versionRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(),
    };
    templateRepo = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(),
      find: jest.fn(),
    };

    service = new ContentManagementService(lessonRepo, contentRepo, versionRepo, templateRepo);
  });

  it('creates text content and initial version', async () => {
    lessonRepo.findOneBy.mockResolvedValue({ id: 'lesson-1' });
    contentRepo.save.mockResolvedValue({
      id: 'content-1',
      lessonId: 'lesson-1',
      title: 'Intro',
      format: ContentFormat.TEXT,
      body: { text: 'hello' },
      videoUrl: null,
      interactiveConfig: null,
      reusable: false,
      templateId: null,
      status: 'draft',
      currentVersion: 1,
    });
    contentRepo.findOne.mockResolvedValue({ id: 'content-1' });

    await service.createContent({
      lessonId: 'lesson-1',
      title: 'Intro',
      format: ContentFormat.TEXT,
      body: { text: 'hello' },
    } as any);

    expect(versionRepo.save).toHaveBeenCalledTimes(1);
    expect(contentRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws for missing lesson', async () => {
    lessonRepo.findOneBy.mockResolvedValue(null);

    await expect(
      service.createContent({
        lessonId: 'missing',
        title: 'Intro',
        format: ContentFormat.TEXT,
        body: { text: 'hello' },
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws for invalid format payload', async () => {
    lessonRepo.findOneBy.mockResolvedValue({ id: 'lesson-1' });

    await expect(
      service.createContent({
        lessonId: 'lesson-1',
        title: 'Video',
        format: ContentFormat.VIDEO,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
