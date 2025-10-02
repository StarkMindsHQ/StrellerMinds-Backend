import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

describe('AssignmentService', () => {
  let service: AssignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssignmentService],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return a success message when a new assignment is created', async () => {
      const createAssignmentDto: CreateAssignmentDto = {
        title: 'Assignment 1',
        instructions: 'Complete the task',
        dueDate: '2025-12-01',
      };
      expect(await service.create(createAssignmentDto)).toBe('This action adds a new assignment');
    });
  });

  describe('findAll', () => {
    it('should return all assignments', async () => {
      expect(await service.findAll()).toBe('This action returns all assignment');
    });
  });

  describe('findOne', () => {
    it('should return a specific assignment by ID', async () => {
      const assignmentId = 1;
      expect(await service.findOne(assignmentId)).toBe(
        `This action returns a #${assignmentId} assignment`,
      );
    });
  });

  describe('update', () => {
    it('should return an updated assignment message', async () => {
      const assignmentId = 1;
      const updateAssignmentDto: UpdateAssignmentDto = {
        title: 'Updated Assignment 1',
        instructions: 'Complete the updated task',
        dueDate: '2025-12-05',
      };
      expect(await service.update(assignmentId, updateAssignmentDto)).toBe(
        `This action updates a #${assignmentId} assignment`,
      );
    });
  });

  describe('remove', () => {
    it('should return a success message when an assignment is removed', async () => {
      const assignmentId = 1;
      expect(await service.remove(assignmentId)).toBe(
        `This action removes a #${assignmentId} assignment`,
      );
    });
  });
});
