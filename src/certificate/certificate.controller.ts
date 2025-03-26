import { Controller } from '@nestjs/common';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { Certificate } from './entity/certificate.entity';
import { CertificatesService } from './certificate.service';
import {
  Delete,
  Get,
  Post,
  Put,
} from '@nestjs/common/decorators/http/request-mapping.decorator';
import {
  Body,
  Param,
} from '@nestjs/common/decorators/http/route-params.decorator';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // Create a new certificate
  @Post()
  async create(
    @Body() createCertificateDto: CreateCertificateDto,
  ): Promise<Certificate> {
    return this.certificatesService.create(createCertificateDto);
  }

  // Get all certificates
  @Get()
  async findAll(): Promise<Certificate[]> {
    return this.certificatesService.findAll();
  }

  // Get a single certificate by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Certificate> {
    return this.certificatesService.findOne(id);
  }

  // Update an existing certificate
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCertificateDto: Partial<CreateCertificateDto>,
  ): Promise<Certificate> {
    return this.certificatesService.update(id, updateCertificateDto);
  }

  // Delete a certificate
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.certificatesService.remove(id);
  }
}
