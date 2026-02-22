import { NotFoundException } from '@nestjs/common';
import { ContentCollaborationService } from './content-collaboration.service';
import { CollaborationRole } from '../enums/collaboration-role.enum';

describe('ContentCollaborationService', () => {
  let service: ContentCollaborationService;
  let contentRepo: any;
  let collaborationRepo: any;

  beforeEach(() => {
    contentRepo = {
      findOne: jest.fn(),
    };
    collaborationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    service = new ContentCollaborationService(contentRepo, collaborationRepo);
  });

  it('adds collaborator when content exists', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'content-1' });
    collaborationRepo.findOne.mockResolvedValue(null);

    const result = await service.addCollaborator('content-1', {
      userId: 'user-1',
      role: CollaborationRole.EDITOR,
    });

    expect(result.userId).toBe('user-1');
    expect(collaborationRepo.save).toHaveBeenCalled();
  });

  it('throws when adding collaborator to unknown content', async () => {
    contentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.addCollaborator('missing', {
        userId: 'user-1',
        role: CollaborationRole.EDITOR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks collaborator as inactive on removal', async () => {
    collaborationRepo.findOne.mockResolvedValue({
      contentId: 'content-1',
      userId: 'user-1',
      isActive: true,
    });
    const result = await service.removeCollaborator('content-1', 'user-1');
    expect(result.isActive).toBe(false);
  });
});
