import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';

describe('AssignmentController', () => {
  let controller: AssignmentController;
  let service: AssignmentService;

  const mockAssignmentService = {
    create: jest.fn().mockResolvedValue('This action adds a new assignment'),
    findAll: jest.fn().mockResolvedValue('This action returns all assignment'),
    findOne: jest.fn().mockResolvedValue('This action returns a #1 assignment'),
    update: jest.fn().mockResolvedValue('This action updates a #1 assignment'),
    remove: jest.fn().mockResolvedValue('This action removes a #1 assignment'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentController],
      providers: [
        {
          provide: AssignmentService,
          useValue: mockAssignmentService,
        },
      ],
    }).compile();

    controller = module.get<AssignmentController>(AssignmentController);
    service = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new assignment and return a success message', async () => {
      const createAssignmentDto: CreateAssignmentDto = {
        title: 'Assignment 1',
        instructions: 'Complete the task',
        dueDate: '2025-12-01',
      };
      expect(await controller.create(createAssignmentDto)).toBe('This action adds a new assignment');
    });
  });

  describe('findAll', () => {
    it('should return all assignments', async () => {
      expect(await controller.findAll()).toBe('This action returns all assignment');
    });
  });

  describe('findOne', () => {
    it('should return a specific assignment by ID', async () => {
      const assignmentId = '1';
      expect(await controller.findOne(assignmentId)).toBe('This action returns a #1 assignment');
    });
  });

  describe('update', () => {
    it('should return an updated assignment message', async () => {
      const assignmentId = '1';
      const updateAssignmentDto: UpdateAssignmentDto = {
        title: 'Updated Assignment 1',
        instructions: 'Complete the updated task',
        dueDate: '2025-12-05',
      };
      expect(await controller.update(assignmentId, updateAssignmentDto)).toBe('This action updates a #1 assignment');
    });
  });

  describe('remove', () => {
    it('should return a success message when an assignment is removed', async () => {
      const assignmentId = '1';
      expect(await controller.remove(assignmentId)).toBe('This action removes a #1 assignment');
    });
  });
});
