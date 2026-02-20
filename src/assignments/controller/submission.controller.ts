import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import * as Express from 'express';
import { SubmissionService } from '../services/submission.service';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { RolesGuard } from 'src/auth/guards/auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('assignments/:assignmentId/submissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async submitAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() submitDto: SubmitAssignmentDto,
    @UploadedFile() file?: Express.MediaType,
  ) {
    return this.submissionService.submitAssignment(assignmentId, submitDto, file);
  }

  @Get()
  async getSubmissions(
    @Param('assignmentId') assignmentId: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.submissionService.getSubmissions(assignmentId, { studentId, status });
  }

  @Get(':submissionId')
  async getSubmission(
    @Param('assignmentId') assignmentId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.submissionService.getSubmission(submissionId);
  }

  @Post(':submissionId/grade')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() gradeDto: GradeSubmissionDto,
  ) {
    return this.submissionService.gradeSubmission(submissionId, gradeDto);
  }

  @Post(':submissionId/annotations')
  async addAnnotation(@Param('submissionId') submissionId: string, @Body() annotationDto: any) {
    return this.submissionService.addAnnotation(submissionId, annotationDto);
  }

  @Get(':submissionId/plagiarism-report')
  async getPlagiarismReport(@Param('submissionId') submissionId: string) {
    return this.submissionService.getPlagiarismReport(submissionId);
  }
}
