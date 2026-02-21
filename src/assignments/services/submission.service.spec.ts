import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Express } from 'express';
import { SubmissionService } from './submission.service';
import { Submission } from '../entities/submission.entity';
import { Assignment, AssignmentType, SubmissionStatus } from '../entities/assignment.entity';
import { Grade } from '../entities/grade.entity';
import { Annotation, AnnotationType } from '../entities/annotation.entity';
import { User, UserRole } from '../../auth/entities/user.entity';
import { FilesService } from '../../files/files.service';
import { PlagiarismService } from './plagiarism.service';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { CreateAnnotationDto } from '../dto/create-annotation.dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let submissionRepository: Repository<Submission>;
  let assignmentRepository: Repository<Assignment>;
  let gradeRepository: Repository<Grade>;
  let annotationRepository: Repository<Annotation>;
  let userRepository: Repository<User>;
  let filesService: FilesService;
  let plagiarismService: PlagiarismService;

  const mockSubmissionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockAssignmentRepository = {
    findOne: jest.fn(),
  };

  const mockGradeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAnnotationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockFilesService = {
    upload: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockPlagiarismService = {
    checkPlagiarism: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentRepository,
        },
        {
          provide: getRepositoryToken(Grade),
          useValue: mockGradeRepository,
        },
        {
          provide: getRepositoryToken(Annotation),
          useValue: mockAnnotationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: PlagiarismService,
          useValue: mockPlagiarismService,
        },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    submissionRepository = module.get<Repository<Submission>>(getRepositoryToken(Submission));
    assignmentRepository = module.get<Repository<Assignment>>(getRepositoryToken(Assignment));
    gradeRepository = module.get<Repository<Grade>>(getRepositoryToken(Grade));
    annotationRepository = module.get<Repository<Annotation>>(getRepositoryToken(Annotation));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    filesService = module.get<FilesService>(FilesService);
    plagiarismService = module.get<PlagiarismService>(PlagiarismService);

    jest.clearAllMocks();
  });

  describe('submitAssignment', () => {
    const mockAssignment: Assignment = {
      id: 'assignment-1',
      title: 'Test Assignment',
      description: 'Test Description',
      type: AssignmentType.TEXT,
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
      lateDueDate: undefined,
      allowLateSubmission: false,
      latePenalty: 0,
      maxPoints: 100,
      allowResubmission: false,
      enablePeerReview: false,
      fileTypes: undefined,
      rubrics: [],
      submissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const submitDto: SubmitAssignmentDto = {
      assignmentId: 'assignment-1',
      submissionType: AssignmentType.TEXT,
      textContent: 'This is my submission',
      submitAsFinal: true,
    };

    it('should successfully submit an assignment', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      mockSubmissionRepository.create.mockReturnValue({
        id: 'submission-1',
        ...submitDto,
        assignment: mockAssignment,
      });
      mockSubmissionRepository.save.mockResolvedValue({
        id: 'submission-1',
        ...submitDto,
        assignment: mockAssignment,
      });
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        ...submitDto,
        assignment: mockAssignment,
        student: null,
        grade: null,
        annotations: [],
      });

      const result = await service.submitAssignment('assignment-1', submitDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('submission-1');
      expect(mockSubmissionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if assignment does not exist', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(null);

      await expect(service.submitAssignment('invalid-id', submitDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for late submission when not allowed', async () => {
      const lateAssignment = {
        ...mockAssignment,
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        allowLateSubmission: false,
      };
      mockAssignmentRepository.findOne.mockResolvedValue(lateAssignment);

      await expect(service.submitAssignment('assignment-1', submitDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle file upload when file is provided', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1000,
      } as Express.Multer.File;

      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      mockFilesService.upload.mockResolvedValue({
        id: 'file-1',
        path: 'user-1/file-1-test.pdf',
      });
      mockSubmissionRepository.create.mockReturnValue({
        id: 'submission-1',
        fileUrl: 'user-1/file-1-test.pdf',
        fileName: 'test.pdf',
      });
      mockSubmissionRepository.save.mockResolvedValue({
        id: 'submission-1',
        fileUrl: 'user-1/file-1-test.pdf',
        fileName: 'test.pdf',
      });
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        fileUrl: 'user-1/file-1-test.pdf',
        fileName: 'test.pdf',
        assignment: mockAssignment,
        student: null,
        grade: null,
        annotations: [],
      });

      const result = await service.submitAssignment('assignment-1', submitDto, mockFile, 'user-1');

      expect(mockFilesService.upload).toHaveBeenCalledWith(mockFile, 'user-1');
      expect(result.fileUrl).toBe('user-1/file-1-test.pdf');
    });

    it('should validate file type if assignment has restrictions', async () => {
      const restrictedAssignment = {
        ...mockAssignment,
        fileTypes: 'pdf,doc',
      };
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1000,
      } as Express.Multer.File;

      mockAssignmentRepository.findOne.mockResolvedValue(restrictedAssignment);

      await expect(
        service.submitAssignment('assignment-1', submitDto, mockFile, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubmissions', () => {
    it('should return submissions for an assignment', async () => {
      const mockAssignment = { id: 'assignment-1' } as Assignment;
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'submission-1' }, { id: 'submission-2' }]),
      };
      mockSubmissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSubmissions('assignment-1');

      expect(result).toHaveLength(2);
      expect(mockSubmissionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply student filter when provided', async () => {
      const mockAssignment = { id: 'assignment-1' } as Assignment;
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'submission-1' }]),
      };
      mockSubmissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getSubmissions('assignment-1', { studentId: 'student-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('student.id = :studentId', {
        studentId: 'student-1',
      });
    });
  });

  describe('getSubmission', () => {
    it('should return a submission by ID', async () => {
      const mockSubmission = {
        id: 'submission-1',
        assignment: { id: 'assignment-1' },
        student: { id: 'student-1' },
        grade: null,
        annotations: [],
      };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      const result = await service.getSubmission('submission-1');

      expect(result).toEqual(mockSubmission);
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.getSubmission('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('gradeSubmission', () => {
    const gradeDto: GradeSubmissionDto = {
      score: 85,
      feedback: 'Good work!',
      published: true,
    };

    it('should create a new grade for submission', async () => {
      const mockSubmission = {
        id: 'submission-1',
        assignment: { id: 'assignment-1', maxPoints: 100 },
        grade: null,
        status: SubmissionStatus.SUBMITTED,
      };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockGradeRepository.create.mockReturnValue({
        id: 'grade-1',
        score: 85,
        feedback: 'Good work!',
      });
      mockGradeRepository.save.mockResolvedValue({
        id: 'grade-1',
        score: 85,
        feedback: 'Good work!',
        isFinal: true,
      });

      const result = await service.gradeSubmission('submission-1', gradeDto, 'instructor-1');

      expect(result.score).toBe(85);
      expect(result.isFinal).toBe(true);
      expect(mockSubmissionRepository.save).toHaveBeenCalled();
    });

    it('should update existing grade', async () => {
      const existingGrade = {
        id: 'grade-1',
        score: 80,
        feedback: 'Previous feedback',
      };
      const mockSubmission = {
        id: 'submission-1',
        assignment: { id: 'assignment-1', maxPoints: 100 },
        grade: existingGrade,
        status: SubmissionStatus.SUBMITTED,
      };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockGradeRepository.save.mockResolvedValue({
        ...existingGrade,
        score: 85,
        feedback: 'Good work!',
      });

      const result = await service.gradeSubmission('submission-1', gradeDto, 'instructor-1');

      expect(result.score).toBe(85);
      expect(mockGradeRepository.save).toHaveBeenCalled();
    });

    it('should apply late penalty when applicable', async () => {
      const mockSubmission = {
        id: 'submission-1',
        assignment: { id: 'assignment-1', maxPoints: 100, latePenalty: 10 },
        grade: null,
        isLate: true,
        status: SubmissionStatus.SUBMITTED,
      };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockGradeRepository.create.mockReturnValue({
        id: 'grade-1',
        score: 90,
        originalScore: 100,
        latePenaltyApplied: 10,
      });
      mockGradeRepository.save.mockResolvedValue({
        id: 'grade-1',
        score: 90,
        originalScore: 100,
        latePenaltyApplied: 10,
      });

      const result = await service.gradeSubmission('submission-1', { score: 100 }, 'instructor-1');

      expect(result.score).toBe(90);
      expect(result.originalScore).toBe(100);
      expect(result.latePenaltyApplied).toBe(10);
    });

    it('should throw BadRequestException for score out of bounds', async () => {
      const mockSubmission = {
        id: 'submission-1',
        assignment: { id: 'assignment-1', maxPoints: 100 },
        grade: null,
      };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);

      await expect(service.gradeSubmission('submission-1', { score: 150 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addAnnotation', () => {
    const annotationDto: CreateAnnotationDto = {
      type: AnnotationType.COMMENT,
      content: 'This is a comment',
      position: { lineNumber: 10, startChar: 5, endChar: 20 },
    };

    it('should add an annotation to a submission', async () => {
      const mockSubmission = { id: 'submission-1' };
      mockSubmissionRepository.findOne.mockResolvedValue(mockSubmission);
      mockAnnotationRepository.create.mockReturnValue({
        id: 'annotation-1',
        ...annotationDto,
      });
      mockAnnotationRepository.save.mockResolvedValue({
        id: 'annotation-1',
        ...annotationDto,
        submission: mockSubmission,
      });

      const result = await service.addAnnotation('submission-1', annotationDto, 'user-1');

      expect(result.id).toBe('annotation-1');
      expect(mockAnnotationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue(null);

      await expect(service.addAnnotation('invalid-id', annotationDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAnnotations', () => {
    it('should return annotations for a submission', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({ id: 'submission-1' });
      mockAnnotationRepository.find.mockResolvedValue([
        { id: 'annotation-1', content: 'Comment 1' },
        { id: 'annotation-2', content: 'Comment 2' },
      ]);

      const result = await service.getAnnotations('submission-1');

      expect(result).toHaveLength(2);
      expect(mockAnnotationRepository.find).toHaveBeenCalledWith({
        where: { submission: { id: 'submission-1' } },
        relations: ['createdBy'],
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('getPlagiarismReport', () => {
    it('should return existing plagiarism report', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        plagiarismScore: 15,
        plagiarismReportUrl: 'http://report.url',
      });

      const result = await service.getPlagiarismReport('submission-1');

      expect(result.score).toBe(15);
      expect(result.reportUrl).toBe('http://report.url');
      expect(result.status).toBe('completed');
    });

    it('should run plagiarism check if not already done', async () => {
      const mockSubmission = {
        id: 'submission-1',
        textContent: 'Some content to check',
        plagiarismScore: null,
        plagiarismReportUrl: null,
      };
      mockSubmissionRepository.findOne.mockResolvedValueOnce(mockSubmission).mockResolvedValueOnce({
        ...mockSubmission,
        plagiarismScore: 10,
      });
      mockPlagiarismService.checkPlagiarism.mockResolvedValue({
        score: 10,
        reportUrl: 'http://new-report.url',
      });

      const result = await service.getPlagiarismReport('submission-1');

      expect(mockPlagiarismService.checkPlagiarism).toHaveBeenCalled();
      expect(result.score).toBe(10);
    });
  });

  describe('deleteSubmission', () => {
    it('should delete a draft submission', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.DRAFT,
        student: { id: 'student-1' },
        fileUrl: null,
      });

      await service.deleteSubmission('submission-1', 'student-1');

      expect(mockSubmissionRepository.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-draft submissions', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.SUBMITTED,
        student: { id: 'student-1' },
      });

      await expect(service.deleteSubmission('submission-1', 'student-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        id: 'submission-1',
        status: SubmissionStatus.DRAFT,
        student: { id: 'student-1' },
      });

      await expect(service.deleteSubmission('submission-1', 'student-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSubmissionStats', () => {
    it('should return submission statistics', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '10',
          drafts: '2',
          submitted: '5',
          graded: '3',
          late: '1',
        }),
      };
      mockSubmissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const mockGradeQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average: '85.5' }),
      };
      mockGradeRepository.createQueryBuilder.mockReturnValue(mockGradeQueryBuilder);

      const result = await service.getSubmissionStats('assignment-1');

      expect(result.totalSubmissions).toBe(10);
      expect(result.draftSubmissions).toBe(2);
      expect(result.submittedCount).toBe(5);
      expect(result.gradedCount).toBe(3);
      expect(result.lateSubmissions).toBe(1);
      expect(result.averageScore).toBe(85.5);
    });
  });
});
