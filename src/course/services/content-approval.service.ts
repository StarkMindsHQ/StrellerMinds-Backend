import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewContentDto } from '../dto/content-management.dto';
import { ContentApproval } from '../entities/content-approval.entity';
import { CourseContent } from '../entities/course-content.entity';
import { ApprovalDecision } from '../enums/approval-decision.enum';
import { ContentStatus } from '../enums/content-status.enum';

@Injectable()
export class ContentApprovalService {
  constructor(
    @InjectRepository(CourseContent)
    private readonly contentRepo: Repository<CourseContent>,
    @InjectRepository(ContentApproval)
    private readonly approvalRepo: Repository<ContentApproval>,
  ) {}

  async requestApproval(contentId: string, comments?: string): Promise<ContentApproval> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    content.status = ContentStatus.IN_REVIEW;
    await this.contentRepo.save(content);

    return this.approvalRepo.save(
      this.approvalRepo.create({
        contentId,
        status: ContentStatus.IN_REVIEW,
        comments,
      }),
    );
  }

  async reviewContent(contentId: string, dto: ReviewContentDto): Promise<ContentApproval> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const pending = await this.approvalRepo.findOne({
      where: { contentId, status: ContentStatus.IN_REVIEW },
      order: { requestedAt: 'DESC' },
    });
    if (!pending) {
      throw new BadRequestException('No pending approval found');
    }

    pending.decision = dto.decision;
    pending.reviewerId = dto.reviewerId;
    pending.comments = dto.comments || pending.comments;
    pending.decidedAt = new Date();

    if (dto.decision === ApprovalDecision.APPROVED) {
      pending.status = ContentStatus.APPROVED;
      content.status = ContentStatus.APPROVED;
    } else if (dto.decision === ApprovalDecision.REJECTED) {
      pending.status = ContentStatus.REJECTED;
      content.status = ContentStatus.REJECTED;
    } else {
      pending.status = ContentStatus.CHANGES_REQUESTED;
      content.status = ContentStatus.CHANGES_REQUESTED;
    }

    await this.contentRepo.save(content);
    return this.approvalRepo.save(pending);
  }

  async publishApprovedContent(contentId: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    if (content.status !== ContentStatus.APPROVED) {
      throw new BadRequestException('Only approved content can be published');
    }

    content.status = ContentStatus.PUBLISHED;
    return this.contentRepo.save(content);
  }

  async getApprovalHistory(contentId: string): Promise<ContentApproval[]> {
    return this.approvalRepo.find({
      where: { contentId },
      order: { requestedAt: 'DESC' },
    });
  }
}
