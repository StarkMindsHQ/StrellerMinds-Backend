// src/submission/submission.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Express } from 'express';
import { CreateSubmissionDto } from '../dtos/createSubmission.dto';
import { Submission } from '../submission.entity';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  async create(createDto: CreateSubmissionDto, file?: Express.Multer.File) {
    const submission = this.submissionRepo.create({
      ...createDto,
      fileUrl: file ? file.path : null,
      status: 'submitted',
    });
    return this.submissionRepo.save(submission);
  }

  async findOne(id: string) {
    const submission = await this.submissionRepo.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async update(id: string, updateDto: Partial<CreateSubmissionDto>, file?: Express.Multer.File) {
    const submission = await this.findOne(id);
    const now = new Date();

    const allowedPeriodInHours = 6;
    const diffHours = (now.getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 3600);
    if (diffHours > allowedPeriodInHours) {
      throw new BadRequestException('Update time expired');
    }

    Object.assign(submission, updateDto);
    if (file) submission.fileUrl = file.path;
    return this.submissionRepo.save(submission);
  }
}