import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface CourseEnrollmentRequestedPayload {
  enrollmentId: string;
  userId: string;
  courseId: string;
  courseName: string;
  coursePrice: number;
  currency: string;
  enrollmentType: 'free' | 'paid' | 'subscription';
  paymentMethod?: 'stripe' | 'stellar' | 'crypto';
  discountCode?: string;
  discountAmount?: number;
  finalAmount: number;
  requestedAt: Date;
  enrollmentSource?: string;
  referralCode?: string;
}

export class CourseEnrollmentRequestedEvent extends DomainEvent {
  constructor(
    private readonly payload: CourseEnrollmentRequestedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(payload.enrollmentId, 'CourseEnrollment', 1, {
      ...metadata,
      userId: payload.userId,
      correlationId: metadata.correlationId,
    });
  }

  getPayload(): CourseEnrollmentRequestedPayload {
    return this.payload;
  }

  static fromJSON(data: any): CourseEnrollmentRequestedEvent {
    return new CourseEnrollmentRequestedEvent(data.payload, data.metadata);
  }
}
