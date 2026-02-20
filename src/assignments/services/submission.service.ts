import { Injectable, NotImplementedException } from '@nestjs/common';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import * as Express from 'express';

@Injectable()
export class SubmissionService {
  // NOTE: This is a minimal/stub implementation so the project compiles
  // and controllers can import the service. Implement repository logic
  // and real persistence according to your app requirements.

  async submitAssignment(
    assignmentId: string,
    submitDto: SubmitAssignmentDto,
    file?: Express.MediaType,
  ): Promise<any> {
    // TODO: save submission to DB and return the created submission
    throw new NotImplementedException('submitAssignment not implemented yet');
  }

  async getSubmissions(
    assignmentId: string,
    filters?: { studentId?: string; status?: string },
  ): Promise<any[]> {
    // TODO: query submissions for an assignment
    throw new NotImplementedException('getSubmissions not implemented yet');
  }

  async getSubmission(submissionId: string): Promise<any> {
    // TODO: fetch a single submission by id
    throw new NotImplementedException('getSubmission not implemented yet');
  }

  async gradeSubmission(submissionId: string, gradeDto: GradeSubmissionDto): Promise<any> {
    // TODO: create/update Grade entity and link to submission
    throw new NotImplementedException('gradeSubmission not implemented yet');
  }

  async addAnnotation(submissionId: string, annotationDto: any): Promise<any> {
    // TODO: create Annotation entity and persist
    throw new NotImplementedException('addAnnotation not implemented yet');
  }

  async getPlagiarismReport(submissionId: string): Promise<any> {
    // TODO: integrate with plagiarism service / return stored report
    throw new NotImplementedException('getPlagiarismReport not implemented yet');
  }
}
