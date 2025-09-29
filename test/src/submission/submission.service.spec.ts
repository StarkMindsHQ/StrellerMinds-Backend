import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionService } from './provider/submission.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Submission } from './submission.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSubmissionDto } from './dtos/createSubmission.dto';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let repo: Repository<Submission>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    repo = module.get(getRepositoryToken(Submission));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create and save a submission with a file', async () => {
      const dto: CreateSubmissionDto = {
        studentId: 'uuid-student',
        assignmentId: 'uuid-assignment',
        textContent: 'My answer',
      };
      const file = { path: 'uploads/file.pdf' } as Express.Multer.File;
      const submission = { id: '1', ...dto, fileUrl: file.path, status: 'submitted' };

      mockRepo.create.mockReturnValue(submission);
      mockRepo.save.mockResolvedValue(submission);

      const result = await service.create(dto, file);
      expect(result).toEqual(submission);
    });

    it('should create a submission without a file', async () => {
      const dto: CreateSubmissionDto = {
        studentId: 'uuid-student',
        assignmentId: 'uuid-assignment',
      };
      const submission = { id: '1', ...dto, fileUrl: null, status: 'submitted' };

      mockRepo.create.mockReturnValue(submission);
      mockRepo.save.mockResolvedValue(submission);

      const result = await service.create(dto);
      expect(result).toEqual(submission);
    });
  });

  describe('findOne', () => {
    it('should return a submission if found', async () => {
      const submission = { id: '1', studentId: 'uuid', assignmentId: 'uuid' };
      mockRepo.findOne.mockResolvedValue(submission);

      const result = await service.findOne('1');
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update submission if within time limit', async () => {
      const submittedAt = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago
      const submission = {
        id: '1',
        studentId: 'uuid',
        assignmentId: 'uuid',
        submittedAt,
      };
      mockRepo.findOne.mockResolvedValue(submission);
      mockRepo.save.mockResolvedValue({ ...submission, textContent: 'Updated' });

      const result = await service.update('1', { textContent: 'Updated' });
      expect(result.textContent).toBe('Updated');
    });

    it('should throw BadRequestException if past 6 hours', async () => {
      const submittedAt = new Date(Date.now() - 1000 * 60 * 60 * 7); // 7 hours ago
      const submission = {
        id: '1',
        studentId: 'uuid',
        assignmentId: 'uuid',
        submittedAt,
      };
      mockRepo.findOne.mockResolvedValue(submission);

      await expect(service.update('1', { textContent: 'Late' })).rejects.toThrow(BadRequestException);
    });
  });
});
