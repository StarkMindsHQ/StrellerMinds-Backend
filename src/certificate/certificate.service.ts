/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entity/certificate.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certificatesRepository: Repository<Certificate>,
  ) {}

  async create(dto: CreateCertificateDto): Promise<Certificate> {
    const certificate = this.certificatesRepository.create(dto);
    return await this.certificatesRepository.save(certificate);
  }

  async findAll(): Promise<Certificate[]> {
    return await this.certificatesRepository.find();
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificatesRepository.findOne({ where: { id } });
    if (!certificate) {
      throw new NotFoundException(`Certificate with id ${id} not found`);
    }
    return certificate;
  }

  async update(id: string, dto: Partial<CreateCertificateDto>): Promise<Certificate> {
    await this.certificatesRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.certificatesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Certificate with id ${id} not found`);
    }
  }
}
