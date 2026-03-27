import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AggregateRoot } from '../../common/domain/aggregate-root.base';
import { Course } from './course-rich.entity';
import { User } from '../../auth/entities/user.entity';
import { 
  EnrollmentCreatedEvent, 
  EnrollmentCompletedEvent 
} from '../../common/domain/events/course.domain-events';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended',
}

@Entity('enrollments')
@Index(['studentId', 'courseId'], { unique: true })
@Index(['status'])
@Index(['enrolledAt'])
@Index(['studentId', 'status'])
export class Enrollment extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  private _status: EnrollmentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  private _progress: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Static factory method for creating new enrollments
  static create(studentId: string, courseId: string): Enrollment {
    const enrollment = new Enrollment();
    
    enrollment.studentId = studentId;
    enrollment.courseId = courseId;
    enrollment._status = EnrollmentStatus.ACTIVE;
    enrollment._progress = 0;
    enrollment.lastAccessedAt = new Date();

    // Add domain event
    enrollment.addDomainEvent(new EnrollmentCreatedEvent(
      enrollment.id,
      studentId,
      courseId,
      enrollment.enrolledAt
    ));

    return enrollment;
  }

  // Getters for private fields
  get status(): EnrollmentStatus {
    return this._status;
  }

  get progress(): number {
    return this._progress;
  }

  // Business logic methods
  updateProgress(newProgress: number): void {
    if (newProgress < 0 || newProgress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    if (this._status !== EnrollmentStatus.ACTIVE) {
      throw new Error('Cannot update progress for inactive enrollment');
    }

    const oldProgress = this._progress;
    this._progress = Math.round(newProgress * 100) / 100; // Round to 2 decimal places
    this.lastAccessedAt = new Date();

    // Auto-complete if progress reaches 100%
    if (this._progress >= 100 && oldProgress < 100) {
      this.complete();
    }
  }

  complete(): void {
    if (this._status === EnrollmentStatus.COMPLETED) {
      throw new Error('Enrollment is already completed');
    }

    this._status = EnrollmentStatus.COMPLETED;
    this._progress = 100;
    this.completedAt = new Date();
    this.lastAccessedAt = new Date();

    this.addDomainEvent(new EnrollmentCompletedEvent(
      this.id,
      this.studentId,
      this.courseId,
      this.completedAt,
      this._progress
    ));
  }

  drop(): void {
    if (this._status === EnrollmentStatus.COMPLETED) {
      throw new Error('Cannot drop completed enrollment');
    }

    if (this._status === EnrollmentStatus.DROPPED) {
      throw new Error('Enrollment is already dropped');
    }

    this._status = EnrollmentStatus.DROPPED;
    this.lastAccessedAt = new Date();
  }

  suspend(): void {
    if (this._status !== EnrollmentStatus.ACTIVE) {
      throw new Error('Only active enrollments can be suspended');
    }

    this._status = EnrollmentStatus.SUSPENDED;
    this.lastAccessedAt = new Date();
  }

  reactivate(): void {
    if (this._status !== EnrollmentStatus.SUSPENDED) {
      throw new Error('Only suspended enrollments can be reactivated');
    }

    this._status = EnrollmentStatus.ACTIVE;
    this.lastAccessedAt = new Date();
  }

  recordAccess(): void {
    this.lastAccessedAt = new Date();
  }

  isActive(): boolean {
    return this._status === EnrollmentStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this._status === EnrollmentStatus.COMPLETED;
  }

  isDropped(): boolean {
    return this._status === EnrollmentStatus.DROPPED;
  }

  isSuspended(): boolean {
    return this._status === EnrollmentStatus.SUSPENDED;
  }

  canBeAccessed(): boolean {
    return this._status === EnrollmentStatus.ACTIVE || this._status === EnrollmentStatus.COMPLETED;
  }

  getCompletionPercentage(): number {
    return this._progress;
  }

  isNearlyCompleted(threshold: number = 80): boolean {
    return this._progress >= threshold;
  }

  getEnrollmentDuration(): number {
    const now = new Date();
    const endTime = this.completedAt || now;
    return Math.floor((endTime.getTime() - this.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)); // Days
  }

  hasBeenInactiveFor(days: number): boolean {
    if (!this.lastAccessedAt) return false;
    
    const now = new Date();
    const inactiveDays = Math.floor((now.getTime() - this.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
    return inactiveDays >= days;
  }
}
