import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './provider/submission.service';
import { CreateSubmissionDto } from './dtos/createSubmission.dto';

describe('SubmissionController', () => {
  let controller: SubmissionController;
  let service: SubmissionService;

  const mockService = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        { provide: SubmissionService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SubmissionController>(SubmissionController);
    service = module.get<SubmissionService>(SubmissionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should call service and return submission', async () => {
      const dto: CreateSubmissionDto = {
        studentId: 'uuid',
        assignmentId: 'uuid',
        textContent: 'Test',
      };
      const file = { path: 'uploads/file.pdf' } as Express.Multer.File;
      const created = { id: '1', ...dto, fileUrl: file.path };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(dto, file);
      expect(result).toEqual(created);
    });
  });

  describe('findOne', () => {
    it('should return submission by id', async () => {
      const submission = { id: '1', studentId: 'uuid' };
      mockService.findOne.mockResolvedValue(submission);

      const result = await controller.findOne('1');
      expect(result).toEqual(submission);
    });
  });

  describe('update', () => {
    it('should update submission', async () => {
      const updated = { id: '1', textContent: 'Updated' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('1', { textContent: 'Updated' });
      expect(result).toEqual(updated);
    });
  });
});
