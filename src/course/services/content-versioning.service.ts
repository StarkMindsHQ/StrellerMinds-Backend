import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseContent } from '../entities/course-content.entity';
import { ContentVersion } from '../entities/content-version.entity';

@Injectable()
export class ContentVersioningService {
  constructor(
    @InjectRepository(CourseContent)
    private readonly contentRepo: Repository<CourseContent>,
    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,
  ) {}

  async getHistory(contentId: string): Promise<ContentVersion[]> {
    return this.versionRepo.find({
      where: { contentId },
      order: { version: 'DESC' },
    });
  }

  async restoreVersion(
    contentId: string,
    versionNumber: number,
    restoredBy?: string,
  ): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const version = await this.versionRepo.findOne({
      where: { contentId, version: versionNumber },
    });
    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const snapshot = version.snapshot || {};
    Object.assign(content, {
      title: snapshot.title ?? content.title,
      format: snapshot.format ?? content.format,
      body: snapshot.body,
      videoUrl: snapshot.videoUrl,
      interactiveConfig: snapshot.interactiveConfig,
      reusable: snapshot.reusable ?? content.reusable,
      templateId: snapshot.templateId ?? content.templateId,
      status: snapshot.status ?? content.status,
      updatedBy: restoredBy,
      currentVersion: content.currentVersion + 1,
    });

    const saved = await this.contentRepo.save(content);
    await this.versionRepo.save(
      this.versionRepo.create({
        contentId: saved.id,
        version: saved.currentVersion,
        snapshot: {
          title: saved.title,
          format: saved.format,
          body: saved.body,
          videoUrl: saved.videoUrl,
          interactiveConfig: saved.interactiveConfig,
          reusable: saved.reusable,
          templateId: saved.templateId,
          status: saved.status,
        },
        changeSummary: `Restored from version ${versionNumber}`,
        createdBy: restoredBy,
      }),
    );

    return saved;
  }

  async compareVersions(contentId: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.versionRepo.findOne({ where: { contentId, version: fromVersion } }),
      this.versionRepo.findOne({ where: { contentId, version: toVersion } }),
    ]);

    if (!from || !to) {
      throw new NotFoundException('Version comparison target not found');
    }

    return {
      contentId,
      fromVersion: from.version,
      toVersion: to.version,
      fromSnapshot: from.snapshot,
      toSnapshot: to.snapshot,
    };
  }
}
