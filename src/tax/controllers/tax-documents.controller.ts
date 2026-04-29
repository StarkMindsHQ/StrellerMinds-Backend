import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TaxDocumentsService } from '../services/tax-documents.service';
import { UploadTaxDocumentDto } from '../dto/upload-tax-document.dto';
import { ListTaxDocumentsDto } from '../dto/list-tax-documents.dto';

@Controller('tax/documents')
export class TaxDocumentsController {
  constructor(private readonly service: TaxDocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(@Body() dto: UploadTaxDocumentDto) {
    return this.service.upload(dto);
  }

  @Get()
  async findAll(@Query() filter: ListTaxDocumentsDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/content')
  @Header('Cache-Control', 'private, no-store')
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { document, content } = await this.service.retrieve(id);
    res.setHeader('Content-Type', document.mimeType ?? 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.filename)}"`,
    );
    res.setHeader('X-IPFS-Hash', document.ipfsHash);
    res.setHeader('X-Content-SHA256', document.contentSha256);
    res.send(content);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.verify(id);
  }
}
