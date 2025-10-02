/**
 * CertificatesController handles endpoints for managing certificates.
 */
import { Controller } from '@nestjs/common';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { Certificate } from './entity/certificate.entity';
import { CertificatesService } from './certificate.service';
import { Delete, Get, Post, Put } from '@nestjs/common/decorators/http/request-mapping.decorator';
import { Body, Param } from '@nestjs/common/decorators/http/route-params.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // Create a new certificate
  @ApiOperation({ summary: 'Create a new certificate' })
  @ApiBody({ type: CreateCertificateDto })
  @ApiResponse({ status: 201, description: 'Certificate created.' })
  @Post()
  async create(@Body() createCertificateDto: CreateCertificateDto): Promise<Certificate> {
    return this.certificatesService.create(createCertificateDto);
  }

  // Get all certificates
  @ApiOperation({ summary: 'Get all certificates' })
  @ApiResponse({ status: 200, description: 'List of certificates.' })
  @Get()
  async findAll(): Promise<Certificate[]> {
    return this.certificatesService.findAll();
  }

  // Get a single certificate by ID
  @ApiOperation({ summary: 'Get a certificate by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate found.' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Certificate> {
    return this.certificatesService.findOne(id);
  }

  // Update an existing certificate
  @ApiOperation({ summary: 'Update a certificate' })
  @ApiParam({ name: 'id', type: 'string', description: 'Certificate ID' })
  @ApiBody({ type: CreateCertificateDto })
  @ApiResponse({ status: 200, description: 'Certificate updated.' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCertificateDto: Partial<CreateCertificateDto>,
  ): Promise<Certificate> {
    return this.certificatesService.update(id, updateCertificateDto);
  }

  // Delete a certificate
  @ApiOperation({ summary: 'Delete a certificate' })
  @ApiParam({ name: 'id', type: 'string', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate deleted.' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.certificatesService.remove(id);
  }
}
