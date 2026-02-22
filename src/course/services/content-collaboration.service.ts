import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddCollaboratorDto } from '../dto/content-management.dto';
import { ContentCollaboration } from '../entities/content-collaboration.entity';
import { CourseContent } from '../entities/course-content.entity';
import { CollaborationRole } from '../enums/collaboration-role.enum';

@Injectable()
export class ContentCollaborationService {
  constructor(
    @InjectRepository(CourseContent)
    private readonly contentRepo: Repository<CourseContent>,
    @InjectRepository(ContentCollaboration)
    private readonly collaborationRepo: Repository<ContentCollaboration>,
  ) {}

  async addCollaborator(contentId: string, dto: AddCollaboratorDto): Promise<ContentCollaboration> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    let collaborator = await this.collaborationRepo.findOne({
      where: { contentId, userId: dto.userId },
    });

    if (!collaborator) {
      collaborator = this.collaborationRepo.create({
        contentId,
        userId: dto.userId,
        role: dto.role,
        isActive: true,
      });
    } else {
      collaborator.role = dto.role;
      collaborator.isActive = true;
    }

    return this.collaborationRepo.save(collaborator);
  }

  async listCollaborators(contentId: string): Promise<ContentCollaboration[]> {
    return this.collaborationRepo.find({
      where: { contentId, isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async updateRole(
    contentId: string,
    userId: string,
    role: CollaborationRole,
  ): Promise<ContentCollaboration> {
    const collaborator = await this.collaborationRepo.findOne({
      where: { contentId, userId, isActive: true },
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }
    collaborator.role = role;
    return this.collaborationRepo.save(collaborator);
  }

  async removeCollaborator(contentId: string, userId: string): Promise<ContentCollaboration> {
    const collaborator = await this.collaborationRepo.findOne({
      where: { contentId, userId, isActive: true },
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }
    collaborator.isActive = false;
    return this.collaborationRepo.save(collaborator);
  }

  async markEditActivity(contentId: string, userId: string): Promise<ContentCollaboration> {
    const collaborator = await this.collaborationRepo.findOne({
      where: { contentId, userId, isActive: true },
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    collaborator.lastEditedAt = new Date();
    return this.collaborationRepo.save(collaborator);
  }
}
