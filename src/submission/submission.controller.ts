// src/submission/submission.controller.ts
import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SubmissionService } from './provider/submission.service';
import { CreateSubmissionDto } from './dtos/createSubmission.dto';
import { FileRateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @FileRateLimit.upload()
  @Post()
  async create(@Body() createDto: CreateSubmissionDto, @Req() req: FastifyRequest) {
    const part = await (req as any).file();
    const file = part
      ? ({
          buffer: await part.toBuffer(),
          mimetype: part.mimetype,
          originalname: part.filename || part.fieldname,
          size: part.file?.bytesRead,
        } as any)
      : undefined;
    return this.submissionService.create(createDto, file);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.submissionService.findOne(id);
  }

  @FileRateLimit.upload()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateSubmissionDto>,
    @Req() req: FastifyRequest,
  ) {
    const part = await (req as any).file();
    const file = part
      ? ({
          buffer: await part.toBuffer(),
          mimetype: part.mimetype,
          originalname: part.filename || part.fieldname,
          size: part.file?.bytesRead,
        } as any)
      : undefined;
    return this.submissionService.update(id, updateDto, file);
  }
}
