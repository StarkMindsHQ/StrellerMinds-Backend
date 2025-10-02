// src/submission/submission.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubmissionDto } from '../dtos/createSubmission.dto';
import { Submission } from '../submission.entity';
import * as fs from 'fs';
import * as path from 'path';
import { UploadedFileLike } from '../../common/types/uploaded-file-like';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  async create(createDto: CreateSubmissionDto, file?: UploadedFileLike) {
    let fileUrl: string | null = null;
    if (file?.buffer) {
      fileUrl = await this.saveBufferToUploads(file);
    }
    const submission = this.submissionRepo.create({
      ...createDto,
      fileUrl,
      status: 'submitted',
    });
    return this.submissionRepo.save(submission);
  }

  async findOne(id: string) {
    const submission = await this.submissionRepo.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async update(id: string, updateDto: Partial<CreateSubmissionDto>, file?: UploadedFileLike) {
    const submission = await this.findOne(id);
    const now = new Date();

    const allowedPeriodInHours = 6;
    const diffHours = (now.getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 3600);
    if (diffHours > allowedPeriodInHours) {
      throw new BadRequestException('Update time expired');
    }

    Object.assign(submission, updateDto);
    if (file?.buffer) submission.fileUrl = await this.saveBufferToUploads(file);
    return this.submissionRepo.save(submission);
  }

  private async saveBufferToUploads(file: UploadedFileLike): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const base = file.originalname || `submission_${Date.now()}`;
    const safeName = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = path.join(uploadsDir, `${Date.now()}_${safeName}`);
    await fs.promises.writeFile(fullPath, file.buffer);
    return fullPath;
  }
}
