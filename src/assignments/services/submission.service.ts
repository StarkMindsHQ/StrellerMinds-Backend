import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities/submission.entity';
import { Assignment, SubmissionStatus } from '../entities/assignment.entity';
import { Grade } from '../entities/grade.entity';
import { Annotation } from '../entities/annotation.entity';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { CreateAnnotationDto } from '../dto/create-annotation.dto';
import { FilesService } from '../../files/files.service';
import { PlagiarismService } from './plagiarism.service';
import { User } from '../../auth/entities/user.entity';

export interface SubmissionFilters {
  studentId?: string;
  status?: string;
}

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Annotation)
    private readonly annotationRepository: Repository<Annotation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly filesService: FilesService,
    private readonly plagiarismService: PlagiarismService,
  ) {}

  /**
   * Submit an assignment with file upload support
   */
  async submitAssignment(
    assignmentId: string,
    submitDto: SubmitAssignmentDto,
    file?: Express.Multer.File,
    studentId?: string,
  ): Promise<Submission> {
    // 1. Validate assignment exists
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    // 2. Check if submission is allowed
    const now = new Date();
    const isLate = now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission) {
      throw new BadRequestException('Late submissions are not allowed for this assignment');
    }

    if (isLate && assignment.lateDueDate && now > assignment.lateDueDate) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // 3. Handle file upload if provided
    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (file) {
      // Validate file type if assignment has restrictions
      if (assignment.fileTypes) {
        const allowedTypes = assignment.fileTypes.split(',').map((t) => t.trim().toLowerCase());
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        if (!allowedTypes.includes(fileExtension || '')) {
          throw new BadRequestException(
            `File type not allowed. Allowed types: ${assignment.fileTypes}`,
          );
        }
      }

      const uploadedFile = await this.filesService.upload(file, studentId || 'anonymous');
      fileUrl = uploadedFile.path;
      fileName = file.originalname;
    }

    // 4. Check for existing submission (for resubmission logic)
    let previousVersionId: string | undefined;
    let version = 1;

    if (assignment.allowResubmission && studentId) {
      const existingSubmission = await this.submissionRepository.findOne({
        where: { assignment: { id: assignmentId }, student: { id: studentId } },
        order: { version: 'DESC' },
      });

      if (existingSubmission) {
        previousVersionId = existingSubmission.id;
        version = existingSubmission.version + 1;
      }
    }

    // 5. Create submission entity
    const submission = this.submissionRepository.create({
      assignment,
      student: studentId ? ({ id: studentId } as User) : undefined,
      submissionType: submitDto.submissionType,
      textContent: submitDto.textContent,
      fileUrl: fileUrl || submitDto.fileUrl,
      fileName: fileName || submitDto.fileName,
      codeContent: submitDto.codeContent,
      programmingLanguage: submitDto.programmingLanguage,
      status: submitDto.submitAsFinal ? SubmissionStatus.SUBMITTED : SubmissionStatus.DRAFT,
      submittedAt: submitDto.submitAsFinal ? new Date() : undefined,
      isLate,
      version,
      previousVersionId,
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    // 6. Run plagiarism check if it's a final submission with content
    if (submitDto.submitAsFinal) {
      await this.runPlagiarismCheck(savedSubmission);
    }

    this.logger.log(`Assignment ${assignmentId} submitted by student ${studentId || 'anonymous'}`);

    return this.getSubmissionWithRelations(savedSubmission.id);
  }

  /**
   * Get all submissions for an assignment with optional filters
   */
  async getSubmissions(assignmentId: string, filters?: SubmissionFilters): Promise<Submission[]> {
    // Verify assignment exists
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.assignment', 'assignment')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('submission.grade', 'grade')
      .leftJoinAndSelect('grade.gradedBy', 'gradedBy')
      .where('assignment.id = :assignmentId', { assignmentId });

    if (filters?.studentId) {
      queryBuilder.andWhere('student.id = :studentId', { studentId: filters.studentId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('submission.status = :status', { status: filters.status });
    }

    // Get only the latest version for each student
    queryBuilder.orderBy('submission.createdAt', 'DESC').addOrderBy('submission.version', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get a single submission by ID with all relations
   */
  async getSubmission(submissionId: string): Promise<Submission> {
    return this.getSubmissionWithRelations(submissionId);
  }

  /**
   * Grade a submission
   */
  async gradeSubmission(
    submissionId: string,
    gradeDto: GradeSubmissionDto,
    graderId?: string,
  ): Promise<Grade> {
    // 1. Get submission with assignment
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment', 'grade'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // 2. Validate score is within bounds
    const maxPoints = submission.assignment.maxPoints;
    if (gradeDto.score < 0 || gradeDto.score > maxPoints) {
      throw new BadRequestException(`Score must be between 0 and ${maxPoints}`);
    }

    // 3. Calculate late penalty if applicable
    let finalScore = gradeDto.score;
    let originalScore: number | undefined;
    let latePenaltyApplied: number | undefined;

    if (submission.isLate && submission.assignment.latePenalty > 0) {
      originalScore = gradeDto.score;
      const penaltyAmount = (gradeDto.score * submission.assignment.latePenalty) / 100;
      latePenaltyApplied = penaltyAmount;
      finalScore = Math.max(0, gradeDto.score - penaltyAmount);
    }

    // 4. Create or update grade
    let grade: Grade;

    if (submission.grade) {
      // Update existing grade
      grade = submission.grade;
      grade.score = finalScore;
      grade.originalScore = originalScore;
      grade.latePenaltyApplied = latePenaltyApplied;
      grade.feedback = gradeDto.feedback;
      grade.rubricScores = gradeDto.rubricScores as any;
      grade.gradedBy = graderId ? ({ id: graderId } as User) : undefined;
      grade.gradedAt = new Date();
      grade.isFinal = gradeDto.published ?? false;
    } else {
      // Create new grade
      grade = this.gradeRepository.create({
        submission,
        score: finalScore,
        originalScore,
        latePenaltyApplied,
        feedback: gradeDto.feedback,
        rubricScores: gradeDto.rubricScores as any,
        gradedBy: graderId ? ({ id: graderId } as User) : undefined,
        gradedAt: new Date(),
        isFinal: gradeDto.published ?? false,
      });
    }

    const savedGrade = await this.gradeRepository.save(grade);

    // 5. Update submission status if grade is published
    if (gradeDto.published) {
      submission.status = SubmissionStatus.GRADED;
      await this.submissionRepository.save(submission);
    }

    this.logger.log(`Submission ${submissionId} graded with score ${finalScore}`);

    return savedGrade;
  }

  /**
   * Add an annotation to a submission
   */
  async addAnnotation(
    submissionId: string,
    annotationDto: CreateAnnotationDto,
    userId?: string,
  ): Promise<Annotation> {
    // 1. Verify submission exists
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // 2. Create annotation
    const annotation = this.annotationRepository.create({
      submission,
      createdBy: userId ? ({ id: userId } as User) : undefined,
      type: annotationDto.type,
      content: annotationDto.content,
      position: annotationDto.position,
      color: annotationDto.color,
    });

    const savedAnnotation = await this.annotationRepository.save(annotation);

    this.logger.log(`Annotation added to submission ${submissionId}`);

    return savedAnnotation;
  }

  /**
   * Get annotations for a submission
   */
  async getAnnotations(submissionId: string): Promise<Annotation[]> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    return this.annotationRepository.find({
      where: { submission: { id: submissionId } },
      relations: ['createdBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get plagiarism report for a submission
   */
  async getPlagiarismReport(submissionId: string): Promise<{
    score: number;
    reportUrl?: string;
    status: string;
    details?: any;
  }> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // If plagiarism check hasn't been run, run it now
    if (submission.plagiarismScore === undefined || submission.plagiarismScore === null) {
      await this.runPlagiarismCheck(submission);
    }

    // Refresh to get updated scores
    const updatedSubmission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    return {
      score: updatedSubmission?.plagiarismScore || 0,
      reportUrl: updatedSubmission?.plagiarismReportUrl,
      status: updatedSubmission?.plagiarismScore !== undefined ? 'completed' : 'pending',
    };
  }

  /**
   * Delete a submission (only if in draft status)
   */
  async deleteSubmission(submissionId: string, userId: string): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['student'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Only allow deletion of draft submissions
    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new ForbiddenException('Only draft submissions can be deleted');
    }

    // Check ownership
    if (submission.student?.id !== userId) {
      throw new ForbiddenException('You can only delete your own submissions');
    }

    // Delete associated file if exists
    if (submission.fileUrl) {
      try {
        // Extract file ID from path if possible
        const fileId = submission.fileUrl.split('/').pop()?.split('-')[0];
        if (fileId) {
          await this.filesService.deleteFile(fileId, userId);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete file for submission ${submissionId}: ${error.message}`);
      }
    }

    await this.submissionRepository.remove(submission);

    this.logger.log(`Submission ${submissionId} deleted by user ${userId}`);
  }

  /**
   * Get submission statistics for an assignment
   */
  async getSubmissionStats(assignmentId: string): Promise<{
    totalSubmissions: number;
    draftSubmissions: number;
    submittedCount: number;
    gradedCount: number;
    lateSubmissions: number;
    averageScore?: number;
  }> {
    const stats = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoin('submission.assignment', 'assignment')
      .where('assignment.id = :assignmentId', { assignmentId })
      .select([
        'COUNT(submission.id) as total',
        'SUM(CASE WHEN submission.status = :draft THEN 1 ELSE 0 END) as drafts',
        'SUM(CASE WHEN submission.status = :submitted THEN 1 ELSE 0 END) as submitted',
        'SUM(CASE WHEN submission.status = :graded THEN 1 ELSE 0 END) as graded',
        'SUM(CASE WHEN submission.isLate = true THEN 1 ELSE 0 END) as late',
      ])
      .setParameters({
        draft: SubmissionStatus.DRAFT,
        submitted: SubmissionStatus.SUBMITTED,
        graded: SubmissionStatus.GRADED,
      })
      .getRawOne();

    // Calculate average score
    const gradeStats = await this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoin('grade.submission', 'submission')
      .leftJoin('submission.assignment', 'assignment')
      .where('assignment.id = :assignmentId', { assignmentId })
      .andWhere('grade.isFinal = true')
      .select('AVG(grade.score)', 'average')
      .getRawOne();

    return {
      totalSubmissions: parseInt(stats.total, 10) || 0,
      draftSubmissions: parseInt(stats.drafts, 10) || 0,
      submittedCount: parseInt(stats.submitted, 10) || 0,
      gradedCount: parseInt(stats.graded, 10) || 0,
      lateSubmissions: parseInt(stats.late, 10) || 0,
      averageScore: gradeStats?.average ? parseFloat(gradeStats.average) : undefined,
    };
  }

  // Private helper methods

  private async getSubmissionWithRelations(submissionId: string): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment', 'student', 'grade', 'grade.gradedBy', 'annotations'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    return submission;
  }

  private async runPlagiarismCheck(submission: Submission): Promise<void> {
    try {
      let contentToCheck = '';

      if (submission.textContent) {
        contentToCheck = submission.textContent;
      } else if (submission.codeContent) {
        contentToCheck = submission.codeContent;
      } else if (submission.fileUrl) {
        contentToCheck = `File submission: ${submission.fileName || 'unknown'}`;
      }

      if (contentToCheck) {
        const result = await this.plagiarismService.checkPlagiarism(
          contentToCheck,
          submission.fileName,
        );

        submission.plagiarismScore = result.score;
        submission.plagiarismReportUrl = result.reportUrl;

        await this.submissionRepository.save(submission);

        this.logger.log(
          `Plagiarism check completed for submission ${submission.id}: ${result.score}%`,
        );
      }
    } catch (error) {
      this.logger.error(`Plagiarism check failed for submission ${submission.id}:`, error);
    }
  }
}
