import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from '../services/submission.service';
import { AssignmentType, SubmissionStatus } from '../entities/assignment.entity';
import { AnnotationType } from '../entities/annotation.entity';
import type { Express } from 'express';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let service: SubmissionService;

  const mockSubmissionService = {
    submitAssignment: jest.fn(),
    getSubmissions: jest.fn(),
    getSubmission: jest.fn(),
    gradeSubmission: jest.fn(),
    addAnnotation: jest.fn(),
    getAnnotations: jest.fn(),
    getPlagiarismReport: jest.fn(),
    deleteSubmission: jest.fn(),
    getSubmissionStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        {
          provide: SubmissionService,
          useValue: mockSubmissionService,
        },
      ],
    }).compile();

    controller = module.get<SubmissionController>(SubmissionController);
    service = module.get<SubmissionService>(SubmissionService);

    jest.clearAllMocks();
  });

  describe('submitAssignment', () => {
    it('should submit an assignment', async () => {
      const submitDto = {
        assignmentId: 'assignment-1',
        submissionType: AssignmentType.TEXT,
        textContent: 'My submission',
        submitAsFinal: true,
      };

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1000,
        stream: undefined,
        destination: '',
        filename: 'test.pdf',
        path: '',
      } as unknown as Express.Multer.File | undefined;

      const expectedResult = {
        id: 'submission-1',
        ...submitDto,
        status: SubmissionStatus.SUBMITTED,
      };

      mockSubmissionService.submitAssignment.mockResolvedValue(expectedResult);

      const result = await controller.submitAssignment('assignment-1', submitDto, mockFile);

      expect(result).toEqual(expectedResult);
      expect(mockSubmissionService.submitAssignment).toHaveBeenCalledWith(
        'assignment-1',
        submitDto,
        mockFile,
      );
    });

    it('should submit without file', async () => {
      const submitDto = {
        assignmentId: 'assignment-1',
        submissionType: AssignmentType.TEXT,
        textContent: 'My submission',
      };

      const expectedResult = {
        id: 'submission-1',
        ...submitDto,
        status: SubmissionStatus.DRAFT,
      };

      mockSubmissionService.submitAssignment.mockResolvedValue(expectedResult);

      const result = await controller.submitAssignment('assignment-1', submitDto, undefined);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('getSubmissions', () => {
    it('should get all submissions for an assignment', async () => {
      const expectedSubmissions = [
        { id: 'submission-1', status: SubmissionStatus.SUBMITTED },
        { id: 'submission-2', status: SubmissionStatus.GRADED },
      ];

      mockSubmissionService.getSubmissions.mockResolvedValue(expectedSubmissions);

      const result = await controller.getSubmissions('assignment-1');

      expect(result).toEqual(expectedSubmissions);
      expect(mockSubmissionService.getSubmissions).toHaveBeenCalledWith('assignment-1', {});
    });

    it('should filter submissions by studentId', async () => {
      const expectedSubmissions = [{ id: 'submission-1', status: SubmissionStatus.SUBMITTED }];

      mockSubmissionService.getSubmissions.mockResolvedValue(expectedSubmissions);

      const result = await controller.getSubmissions('assignment-1', 'student-1', undefined);

      expect(mockSubmissionService.getSubmissions).toHaveBeenCalledWith('assignment-1', {
        studentId: 'student-1',
        status: undefined,
      });
    });

    it('should filter submissions by status', async () => {
      const expectedSubmissions = [{ id: 'submission-1', status: SubmissionStatus.GRADED }];

      mockSubmissionService.getSubmissions.mockResolvedValue(expectedSubmissions);

      const result = await controller.getSubmissions('assignment-1', undefined, 'graded');

      expect(mockSubmissionService.getSubmissions).toHaveBeenCalledWith('assignment-1', {
        studentId: undefined,
        status: 'graded',
      });
    });
  });

  describe('getSubmission', () => {
    it('should get a single submission', async () => {
      const expectedSubmission = {
        id: 'submission-1',
        status: SubmissionStatus.SUBMITTED,
        assignment: { id: 'assignment-1' },
      };

      mockSubmissionService.getSubmission.mockResolvedValue(expectedSubmission);

      const result = await controller.getSubmission('assignment-1', 'submission-1');

      expect(result).toEqual(expectedSubmission);
      expect(mockSubmissionService.getSubmission).toHaveBeenCalledWith('submission-1');
    });
  });

  describe('gradeSubmission', () => {
    it('should grade a submission', async () => {
      const gradeDto = {
        score: 85,
        feedback: 'Good work!',
        published: true,
      };

      const expectedGrade = {
        id: 'grade-1',
        score: 85,
        feedback: 'Good work!',
        isFinal: true,
      };

      mockSubmissionService.gradeSubmission.mockResolvedValue(expectedGrade);

      const result = await controller.gradeSubmission('submission-1', gradeDto);

      expect(result).toEqual(expectedGrade);
      expect(mockSubmissionService.gradeSubmission).toHaveBeenCalledWith('submission-1', gradeDto);
    });
  });

  describe('addAnnotation', () => {
    it('should add an annotation', async () => {
      const annotationDto = {
        type: AnnotationType.COMMENT,
        content: 'This is a comment',
        position: { lineNumber: 10 },
      };

      const expectedAnnotation = {
        id: 'annotation-1',
        ...annotationDto,
      };

      mockSubmissionService.addAnnotation.mockResolvedValue(expectedAnnotation);

      const result = await controller.addAnnotation('submission-1', annotationDto);

      expect(result).toEqual(expectedAnnotation);
      expect(mockSubmissionService.addAnnotation).toHaveBeenCalledWith(
        'submission-1',
        annotationDto,
      );
    });
  });

  describe('getPlagiarismReport', () => {
    it('should get plagiarism report', async () => {
      const expectedReport = {
        score: 15,
        reportUrl: 'http://report.url',
        status: 'completed',
      };

      mockSubmissionService.getPlagiarismReport.mockResolvedValue(expectedReport);

      const result = await controller.getPlagiarismReport('submission-1');

      expect(result).toEqual(expectedReport);
      expect(mockSubmissionService.getPlagiarismReport).toHaveBeenCalledWith('submission-1');
    });
  });
});
