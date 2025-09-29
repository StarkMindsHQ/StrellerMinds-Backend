// src/enrollment/enrollment.service.spec.ts
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  beforeEach(() => {
    service = new EnrollmentService();
  });

  describe('enroll', () => {
    it('should enroll a student successfully', async () => {
      const dto: CreateEnrollmentDto = { studentId: 'student1', courseId: 'course1' };
      const enrollment = await service.enroll(dto);

      expect(enrollment).toHaveProperty('id');
      expect(enrollment.studentId).toBe('student1');
      expect(enrollment.courseId).toBe('course1');
      expect(enrollment.status).toBe('ENROLLED');
      expect(enrollment.paymentStatus).toBe('PAID');
    });

    it('should throw error if already enrolled', async () => {
      const dto: CreateEnrollmentDto = { studentId: 'student2', courseId: 'course1' };
      await service.enroll(dto);

      await expect(service.enroll(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if course is full', async () => {
      const dto1 = { studentId: 's1', courseId: 'course1' };
      const dto2 = { studentId: 's2', courseId: 'course1' };
      const dto3 = { studentId: 's3', courseId: 'course1' };

      await service.enroll(dto1);
      await service.enroll(dto2);

      await expect(service.enroll(dto3)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if prerequisites are not met', async () => {
      const dto: CreateEnrollmentDto = { studentId: 'student3', courseId: 'course2' }; // course2 requires course1

      await expect(service.enroll(dto)).rejects.toThrow(BadRequestException);
    });

    it('should allow enrollment after completing prerequisites', async () => {
      const studentId = 'student4';

      // Complete course1 first
      await service.enroll({ studentId, courseId: 'course1' });

      // Then enroll in course2
      const enrollment = await service.enroll({ studentId, courseId: 'course2' });

      expect(enrollment.courseId).toBe('course2');
      expect(enrollment.status).toBe('ENROLLED');
    });
  });

  describe('unenroll', () => {
    it('should unenroll a student successfully', async () => {
      const dto: CreateEnrollmentDto = { studentId: 'student5', courseId: 'course1' };
      const enrollment = await service.enroll(dto);

      await service.unenroll(enrollment.id);

      const found = service.findAll().find(e => e.id === enrollment.id);
      expect(found.status).toBe('UNENROLLED');
    });

    it('should throw error if enrollment not found', async () => {
      await expect(service.unenroll('non-existing-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw error if already unenrolled', async () => {
      const dto: CreateEnrollmentDto = { studentId: 'student6', courseId: 'course1' };
      const enrollment = await service.enroll(dto);

      await service.unenroll(enrollment.id);

      await expect(service.unenroll(enrollment.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all enrollments', async () => {
      const dto1: CreateEnrollmentDto = { studentId: 'student7', courseId: 'course1' };
      const dto2: CreateEnrollmentDto = { studentId: 'student8', courseId: 'course1' };

      await service.enroll(dto1);
      await service.enroll(dto2);

      const enrollments = service.findAll();
      expect(enrollments.length).toBeGreaterThanOrEqual(2);
    });
  });
});
