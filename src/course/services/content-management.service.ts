import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { CourseContent } from '../entities/course-content.entity';
import { ContentVersion } from '../entities/content-version.entity';
import { ContentTemplate } from '../entities/content-template.entity';
import { ContentFormat } from '../enums/content-format.enum';
import {
  CreateContentDto,
  CreateContentFromTemplateDto,
  CreateTemplateDto,
  UpdateContentDto,
} from '../dto/content-management.dto';

@Injectable()
export class ContentManagementService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(CourseContent)
    private readonly contentRepo: Repository<CourseContent>,
    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,
    @InjectRepository(ContentTemplate)
    private readonly templateRepo: Repository<ContentTemplate>,
  ) {}

  async createContent(dto: CreateContentDto): Promise<CourseContent> {
    const lesson = await this.lessonRepo.findOneBy({ id: dto.lessonId });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    this.validateContentPayload(dto.format, dto.body, dto.videoUrl, dto.interactiveConfig);

    const content = await this.contentRepo.save(
      this.contentRepo.create({
        lessonId: dto.lessonId,
        title: dto.title,
        format: dto.format,
        body: dto.body,
        videoUrl: dto.videoUrl,
        interactiveConfig: dto.interactiveConfig,
        reusable: dto.reusable ?? false,
        templateId: dto.templateId,
        createdBy: dto.createdBy,
        updatedBy: dto.createdBy,
      }),
    );

    await this.versionRepo.save(
      this.versionRepo.create({
        contentId: content.id,
        version: 1,
        snapshot: this.snapshot(content),
        changeSummary: dto.changeSummary || 'Initial content creation',
        createdBy: dto.createdBy,
      }),
    );

    return this.getContentById(content.id);
  }

  async updateContent(contentId: string, dto: UpdateContentDto): Promise<CourseContent> {
    const content = await this.getContentById(contentId);
    const nextFormat = dto.format || content.format;
    const nextBody = dto.body !== undefined ? dto.body : content.body;
    const nextVideoUrl = dto.videoUrl !== undefined ? dto.videoUrl : content.videoUrl;
    const nextInteractive =
      dto.interactiveConfig !== undefined ? dto.interactiveConfig : content.interactiveConfig;
    this.validateContentPayload(nextFormat, nextBody, nextVideoUrl, nextInteractive);

    Object.assign(content, {
      title: dto.title ?? content.title,
      format: nextFormat,
      body: nextBody,
      videoUrl: nextVideoUrl,
      interactiveConfig: nextInteractive,
      reusable: dto.reusable ?? content.reusable,
      templateId: dto.templateId ?? content.templateId,
      updatedBy: dto.updatedBy ?? content.updatedBy,
      currentVersion: content.currentVersion + 1,
    });

    const saved = await this.contentRepo.save(content);
    await this.versionRepo.save(
      this.versionRepo.create({
        contentId: saved.id,
        version: saved.currentVersion,
        snapshot: this.snapshot(saved),
        changeSummary: dto.changeSummary || 'Content updated',
        createdBy: dto.updatedBy,
      }),
    );

    return this.getContentById(saved.id);
  }

  async getContentById(contentId: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
      relations: ['versions', 'collaborators', 'approvals'],
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  async listLessonContents(lessonId: string): Promise<CourseContent[]> {
    return this.contentRepo.find({
      where: { lessonId },
      order: { updatedAt: 'DESC' },
    });
  }

  async createTemplate(dto: CreateTemplateDto): Promise<ContentTemplate> {
    const existing = await this.templateRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Template name already exists');
    }

    return this.templateRepo.save(
      this.templateRepo.create({
        name: dto.name,
        description: dto.description,
        format: dto.format,
        blueprint: dto.blueprint,
        isGlobal: dto.isGlobal ?? false,
        createdBy: dto.createdBy,
      }),
    );
  }

  async createFromTemplate(dto: CreateContentFromTemplateDto): Promise<CourseContent> {
    const template = await this.templateRepo.findOne({ where: { id: dto.templateId } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const lesson = await this.lessonRepo.findOneBy({ id: dto.lessonId });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const blueprint = template.blueprint || {};
    const payload: CreateContentDto = {
      lessonId: dto.lessonId,
      title: dto.title || blueprint.title || template.name,
      format: template.format,
      body: blueprint.body,
      videoUrl: blueprint.videoUrl,
      interactiveConfig: blueprint.interactiveConfig,
      reusable: true,
      templateId: template.id,
      createdBy: dto.createdBy || template.createdBy,
      changeSummary: `Created from template: ${template.name}`,
    };

    const content = await this.createContent(payload);
    template.usageCount += 1;
    await this.templateRepo.save(template);

    return content;
  }

  async listTemplates(format?: ContentFormat): Promise<ContentTemplate[]> {
    const where = format ? { format } : {};
    return this.templateRepo.find({
      where,
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
  }

  private validateContentPayload(
    format: ContentFormat,
    body?: Record<string, any>,
    videoUrl?: string,
    interactiveConfig?: Record<string, any>,
  ): void {
    if (format === ContentFormat.VIDEO && !videoUrl) {
      throw new BadRequestException('videoUrl is required for video content');
    }

    if (format === ContentFormat.TEXT && (!body || Object.keys(body).length === 0)) {
      throw new BadRequestException('body is required for text content');
    }

    if (format === ContentFormat.INTERACTIVE && !interactiveConfig) {
      throw new BadRequestException(
        'interactiveConfig is required for interactive content',
      );
    }
  }

  private snapshot(content: CourseContent): Record<string, any> {
    return {
      title: content.title,
      format: content.format,
      body: content.body,
      videoUrl: content.videoUrl,
      interactiveConfig: content.interactiveConfig,
      reusable: content.reusable,
      templateId: content.templateId,
      status: content.status,
    };
  }
}
