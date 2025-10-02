// src/enrollment/enrollment.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { Enrollment } from './entities/enrollment.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * EnrollmentService provides logic for enrolling, unenrolling, and listing enrollments.
 */
@Injectable()
export class EnrollmentService {
  private enrollments: Enrollment[] = []; // Simulating DB
  private courseCapacities = { course1: 2, course2: 3 }; // example
  private prerequisites = { course2: ['course1'] }; // example

  /**
   * Enroll a student in a course.
   * @param createEnrollmentDto - DTO containing student and course IDs
   * @returns The created Enrollment entity
   */
  async enroll(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    const { studentId, courseId } = createEnrollmentDto;

    // Check if already enrolled
    const existing = this.enrollments.find(
      (e) => e.studentId === studentId && e.courseId === courseId && e.status === 'ENROLLED',
    );
    if (existing) throw new BadRequestException('Already enrolled.');

    // Capacity Check
    const enrolledCount = this.enrollments.filter(
      (e) => e.courseId === courseId && e.status === 'ENROLLED',
    ).length;
    const capacity = this.courseCapacities[courseId] ?? 100;
    if (enrolledCount >= capacity) throw new BadRequestException('Course capacity full.');

    // Prerequisite Check
    const prereqs = this.prerequisites[courseId];
    if (prereqs) {
      const completed = prereqs.every((prereq) =>
        this.enrollments.find(
          (e) => e.courseId === prereq && e.studentId === studentId && e.status === 'ENROLLED',
        ),
      );
      if (!completed) throw new BadRequestException('Prerequisites not met.');
    }

    // (Mock) Payment
    const paymentSuccess = true; // Always success for now

    const enrollment: Enrollment = {
      id: uuidv4(),
      studentId,
      courseId,
      enrolledAt: new Date(),
      status: 'ENROLLED',
      paymentStatus: paymentSuccess ? 'PAID' : 'PENDING',
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  /**
   * Unenroll a student from a course.
   * @param enrollmentId - Enrollment ID
   */
  async unenroll(enrollmentId: string): Promise<void> {
    const enrollment = this.enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) throw new NotFoundException('Enrollment not found.');
    if (enrollment.status === 'UNENROLLED') throw new BadRequestException('Already unenrolled.');

    enrollment.status = 'UNENROLLED';
  }

  /**
   * List all enrollments.
   * @returns Array of Enrollment entities
   */
  findAll(): Enrollment[] {
    return this.enrollments;
  }
}
