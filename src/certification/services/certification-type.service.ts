import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CertificationType } from '../entities/certification-type.entity';
import type { CreateCertificationTypeDto } from '../dto/create-certification-type.dto';
import type { UpdateCertificationTypeDto } from '../dto/update-certification-type.dto';

@Injectable()
export class CertificationTypeService {
  private readonly logger = new Logger(CertificationTypeService.name);

  constructor(private certificationTypeRepository: Repository<CertificationType>) {}

  async create(createDto: CreateCertificationTypeDto): Promise<CertificationType> {
    const certificationType = this.certificationTypeRepository.create(createDto);
    const saved = await this.certificationTypeRepository.save(certificationType);

    this.logger.log(`Certification type created: ${saved.id}`);
    return saved;
  }

  async findAll(): Promise<CertificationType[]> {
    return this.certificationTypeRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CertificationType> {
    const certificationType = await this.certificationTypeRepository.findOne({
      where: { id },
      relations: ['certificates'],
    });

    if (!certificationType) {
      throw new NotFoundException(`Certification type with ID ${id} not found`);
    }

    return certificationType;
  }

  async update(id: string, updateDto: UpdateCertificationTypeDto): Promise<CertificationType> {
    const certificationType = await this.findOne(id);
    Object.assign(certificationType, updateDto);

    const updated = await this.certificationTypeRepository.save(certificationType);
    this.logger.log(`Certification type updated: ${updated.id}`);

    return updated;
  }

  async remove(id: string): Promise<void> {
    const certificationType = await this.findOne(id);
    certificationType.isActive = false;
    await this.certificationTypeRepository.save(certificationType);

    this.logger.log(`Certification type deactivated: ${id}`);
  }

  async findByCategory(category: string): Promise<CertificationType[]> {
    return this.certificationTypeRepository.find({
      where: { category: category as any, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getStats(id: string) {
    const certificationType = await this.findOne(id);

    const totalCertificates = await this.certificationTypeRepository
      .createQueryBuilder('ct')
      .leftJoin('ct.certificates', 'c')
      .where('ct.id = :id', { id })
      .getCount();

    const issuedCertificates = await this.certificationTypeRepository
      .createQueryBuilder('ct')
      .leftJoin('ct.certificates', 'c')
      .where('ct.id = :id', { id })
      .andWhere('c.status = :status', { status: 'issued' })
      .getCount();

    return {
      certificationType,
      stats: {
        totalCertificates,
        issuedCertificates,
        pendingCertificates: totalCertificates - issuedCertificates,
      },
    };
  }
}
