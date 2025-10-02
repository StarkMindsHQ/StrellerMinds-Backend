import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './entity/content.entity';
import { ContentVersion } from './entity/content-version.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(Content)
    private contentRepo: Repository<Content>,
    @InjectRepository(ContentVersion)
    private versionRepo: Repository<ContentVersion>,
  ) {}

  async create(data: CreateContentDto, authorId: string): Promise<Content> {
    const content = this.contentRepo.create({ ...data, author: { id: authorId } });
    const saved = await this.contentRepo.save(content);
    const version = this.versionRepo.create({
      content: saved,
      title: saved.title,
      body: saved.body,
    });
    await this.versionRepo.save(version);
    return saved;
  }

  async update(id: string, data: UpdateContentDto): Promise<Content> {
    const content = await this.contentRepo.findOneBy({ id });
    Object.assign(content, data);
    const updated = await this.contentRepo.save(content);
    const version = this.versionRepo.create({
      content: updated,
      title: updated.title,
      body: updated.body,
    });
    await this.versionRepo.save(version);
    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Content> {
    const content = await this.contentRepo.findOneBy({ id });
    content.status = dto.status;
    return this.contentRepo.save(content);
  }

  async findVersions(id: string): Promise<ContentVersion[]> {
    return this.versionRepo.find({
      where: { content: { id } },
      order: { createdAt: 'DESC' },
    });
  }
}
