import { Controller, Get, Post } from '@nestjs/common';
import type { SkillAssessmentService } from '../services/skill-assessment.service';
import type { CreateSkillAssessmentDto } from '../dto/create-skill-assessment.dto';
import type { StartAssessmentDto } from '../dto/start-assessment.dto';
import type { SubmitAssessmentDto } from '../dto/submit-assessment.dto';

@Controller('skill-assessments')
export class SkillAssessmentController {
  constructor(private readonly skillAssessmentService: SkillAssessmentService) {}

  @Post()
  async create(createDto: CreateSkillAssessmentDto) {
    return this.skillAssessmentService.create(createDto);
  }

  @Get()
  async findAll(skillArea?: string) {
    if (skillArea) {
      return this.skillAssessmentService.findBySkillArea(skillArea);
    }
    return this.skillAssessmentService.findAll();
  }

  @Get(':id')
  async findOne(id: string) {
    return this.skillAssessmentService.findOne(id);
  }

  @Get(':id/stats')
  async getStats(id: string) {
    return this.skillAssessmentService.getAssessmentStats(id);
  }

  @Post('start')
  async startAssessment(startDto: StartAssessmentDto) {
    return this.skillAssessmentService.startAssessment(startDto);
  }

  @Get('attempts/:attemptId')
  async getAssessmentForAttempt(attemptId: string) {
    return this.skillAssessmentService.getAssessmentForAttempt(attemptId);
  }

  @Post('submit')
  async submitAssessment(submitDto: SubmitAssessmentDto) {
    return this.skillAssessmentService.submitAssessment(submitDto);
  }

  @Get('user/:userId/attempts')
  async getUserAttempts(userId: string, assessmentId?: string) {
    return this.skillAssessmentService.getUserAttempts(userId, assessmentId);
  }
}
