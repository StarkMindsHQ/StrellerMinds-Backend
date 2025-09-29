import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseVersion } from '../entities/course-version.entity';
import { CreateCourseVersionDto } from '../dto/course-version.dto';

@Injectable()
export class CourseVersionsService {
  constructor(
    @InjectRepository(CourseVersion)
    private versionRepository: Repository<CourseVersion>,
  ) {}

  async createVersion(
    courseId: string,
    createVersionDto: CreateCourseVersionDto,
  ): Promise<CourseVersion> {
    // Deactivate previous active version
    await this.versionRepository.update(
      { courseId, isActive: true },
      { isActive: false },
    );

    const version = this.versionRepository.create({
      ...createVersionDto,
      courseId,
      isActive: true,
    });

    return this.versionRepository.save(version);
  }

  async getCourseVersions(courseId: string): Promise<CourseVersion[]> {
    return this.versionRepository.find({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async getVersion(id: string): Promise<CourseVersion> {
    const version = await this.versionRepository.findOne({ where: { id } });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  async publishVersion(id: string): Promise<CourseVersion> {
    const version = await this.getVersion(id);

    // Unpublish other versions
    await this.versionRepository.update(
      { courseId: version.courseId, isPublished: true },
      { isPublished: false },
    );

    version.isPublished = true;
    return this.versionRepository.save(version);
  }

  async compareVersions(versionId1: string, versionId2: string) {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    return {
      version1: {
        id: version1.id,
        version: version1.version,
        content: version1.content,
        createdAt: version1.createdAt,
      },
      version2: {
        id: version2.id,
        version: version2.version,
        content: version2.content,
        createdAt: version2.createdAt,
      },
      differences: this.calculateDifferences(
        version1.content,
        version2.content,
      ),
    };
  }

  private calculateDifferences(content1: any, content2: any) {
    // Simple difference calculation - you might want to use a more sophisticated diff library
    const changes = [];

    const keys1 = Object.keys(content1 || {});
    const keys2 = Object.keys(content2 || {});
    const allKeys = [...new Set([...keys1, ...keys2])];

    allKeys.forEach((key) => {
      if (content1[key] !== content2[key]) {
        changes.push({
          field: key,
          oldValue: content1[key],
          newValue: content2[key],
          changeType: !content1[key]
            ? 'added'
            : !content2[key]
              ? 'removed'
              : 'modified',
        });
      }
    });

    return changes;
  }
}
