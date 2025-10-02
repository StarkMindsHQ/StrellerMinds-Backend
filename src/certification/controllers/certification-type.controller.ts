import { Controller, Get, Post, Patch, Param, Delete } from '@nestjs/common';
import type { CertificationTypeService } from '../services/certification-type.service';
import type { CreateCertificationTypeDto } from '../dto/create-certification-type.dto';
import type { UpdateCertificationTypeDto } from '../dto/update-certification-type.dto';

@Controller('certification-types')
export class CertificationTypeController {
  constructor(private readonly certificationTypeService: CertificationTypeService) {}

  @Post()
  async create(createDto: CreateCertificationTypeDto) {
    return this.certificationTypeService.create(createDto);
  }

  @Get()
  async findAll(category?: string) {
    if (category) {
      return this.certificationTypeService.findByCategory(category);
    }
    return this.certificationTypeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.certificationTypeService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, updateDto: UpdateCertificationTypeDto) {
    return this.certificationTypeService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.certificationTypeService.remove(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.certificationTypeService.getStats(id);
  }
}
