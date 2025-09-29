import { Injectable } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

/**
 * AssignmentService provides assignment CRUD logic.
 */
@Injectable()
export class AssignmentService {
  /**
   * Create a new assignment.
   */
  create(createAssignmentDto: CreateAssignmentDto) {
    return 'This action adds a new assignment';
  }

  /**
   * Get all assignments.
   */
  findAll() {
    return `This action returns all assignment`;
  }

  /**
   * Get an assignment by ID.
   */
  findOne(id: number) {
    return `This action returns a #${id} assignment`;
  }

  /**
   * Update an assignment by ID.
   */
  update(id: number, updateAssignmentDto: UpdateAssignmentDto) {
    return `This action updates a #${id} assignment`;
  }

  /**
   * Remove an assignment by ID.
   */
  remove(id: number) {
    return `This action removes a #${id} assignment`;
  }
}
