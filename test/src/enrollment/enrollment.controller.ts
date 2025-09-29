/**
 * EnrollmentController handles endpoints for enrolling, unenrolling, and listing enrollments.
 */
import { Controller, Post, Body, Delete, Param, Get, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Enrollment } from './entities/enrollment.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Enrollment')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * Enroll a student in a course.
   * @param createEnrollmentDto - DTO containing student and course IDs
   * @returns The created Enrollment entity
   */
  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, type: Enrollment })
  async enroll(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return await this.enrollmentService.enroll(createEnrollmentDto);
  }

  /**
   * Unenroll a student from a course.
   * @param id - Enrollment ID
   * @returns Success message
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll from a course' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully.' })
  async unenroll(@Param('id') id: string) {
    await this.enrollmentService.unenroll(id);
    return { message: 'Unenrolled successfully.' };
  }

  /**
   * List all enrollments (for testing purposes).
   * @returns Array of Enrollment entities
   */
  @Get()
  @ApiOperation({ summary: 'List all enrollments (testing purpose)' })
  @ApiResponse({ status: 200, type: [Enrollment] })
  findAll() {
    return this.enrollmentService.findAll();
  }
}
