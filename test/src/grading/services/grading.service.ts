import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from '../entities/grade-entity';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';
import { User } from '../../users/entities/user.entity';

/**
 * GradingService provides logic for grading assignments and updating grades.
 */
@Injectable()
export class GradingService {
  /**
   * Creates an instance of GradingService.
   * @param gradeRepository - The grade repository
   */
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
  ) {}

  /**
   * Grade a student assignment.
   * @param mentor - Mentor user
   * @param studentId - Student ID
   * @param assignmentId - Assignment ID
   * @param dto - Grade data
   * @returns The created Grade entity
   */
  async gradeAssignment(
    mentor: User,
    studentId: number,
    assignmentId: number,
    dto: CreateGradeDto,
  ) {
    const grade = this.gradeRepository.create({
      mentor,
      student: { id: studentId } as any,
      assignment: { id: assignmentId } as any,
      numericGrade: dto.numericGrade,
      feedback: dto.feedback,
    });
    return this.gradeRepository.save(grade);
  }

  /**
   * Update an existing grade.
   * @param mentor - Mentor user
   * @param gradeId - Grade ID
   * @param dto - Updated grade data
   * @returns The updated Grade entity
   */
  async updateGrade(mentor: User, gradeId: number, dto: UpdateGradeDto) {
    const grade = await this.gradeRepository.findOne({
      where: { id: gradeId },
      relations: ['mentor'],
    });
    if (!grade) throw new NotFoundException('Grade not found.');
    if (grade.mentor.id !== mentor.id)
      throw new ForbiddenException('You cannot update this grade.');

    Object.assign(grade, dto);
    return this.gradeRepository.save(grade);
  }

  /**
   * Get grading history for a mentor.
   * @param mentor - Mentor user
   * @returns Array of Grade entities
   */
  async getGradingHistory(mentor: User) {
    return this.gradeRepository.find({
      where: { mentor: { id: mentor.id } },
      relations: ['student', 'assignment'],
    });
  }
}
