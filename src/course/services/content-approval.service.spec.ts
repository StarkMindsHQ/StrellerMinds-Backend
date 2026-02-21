import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentApprovalService } from './content-approval.service';
import { ApprovalDecision } from '../enums/approval-decision.enum';
import { ContentStatus } from '../enums/content-status.enum';

describe('ContentApprovalService', () => {
  let service: ContentApprovalService;
  let contentRepo: any;
  let approvalRepo: any;

  beforeEach(() => {
    contentRepo = {
      findOne: jest.fn(),
      save: jest.fn((v) => Promise.resolve(v)),
    };
    approvalRepo = {
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    service = new ContentApprovalService(contentRepo, approvalRepo);
  });

  it('requests approval and moves content to review', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'c1', status: ContentStatus.DRAFT });
    await service.requestApproval('c1', 'ready for review');

    expect(contentRepo.save).toHaveBeenCalled();
    expect(approvalRepo.save).toHaveBeenCalled();
  });

  it('approves content through review workflow', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'c1', status: ContentStatus.IN_REVIEW });
    approvalRepo.findOne.mockResolvedValue({
      id: 'a1',
      contentId: 'c1',
      status: ContentStatus.IN_REVIEW,
    });

    const result = await service.reviewContent('c1', {
      reviewerId: 'u1',
      decision: ApprovalDecision.APPROVED,
    });

    expect(result.status).toBe(ContentStatus.APPROVED);
  });

  it('blocks publish when content is not approved', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'c1', status: ContentStatus.DRAFT });
    await expect(service.publishApprovedContent('c1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when content not found', async () => {
    contentRepo.findOne.mockResolvedValue(null);
    await expect(
      service.reviewContent('missing', {
        reviewerId: 'u1',
        decision: ApprovalDecision.REJECTED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
