import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTemplate } from '../entities/report-template.entity';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';

@Injectable()
export class ReportBuilderService {
  constructor(
    @InjectRepository(ReportTemplate)
    private templateRepository: Repository<ReportTemplate>,
  ) {}

  async createTemplate(dto: CreateReportTemplateDto, ownerId: string): Promise<ReportTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      ownerId,
    });
    return this.templateRepository.save(template);
  }

  async findAll(ownerId: string): Promise<ReportTemplate[]> {
    return this.templateRepository.find({ where: { ownerId } });
  }

  async findOne(id: string): Promise<ReportTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Report template ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: Partial<CreateReportTemplateDto>): Promise<ReportTemplate> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }
}