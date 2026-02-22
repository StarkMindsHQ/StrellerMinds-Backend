import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AssessmentsService } from '../services/assessments.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  create(@Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(dto);
  }

  @Get()
  findAll() {
    return this.assessmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Get(':id/report')
  report(@Param('id') id: string) {
    return this.assessmentsService.generateReport(id);
  }
}
