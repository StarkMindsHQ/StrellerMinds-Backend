import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface CourseEnrollmentCompletedPayload {
  enrollmentId: string;
  userId: string;
  courseId: string;
  courseName: string;
  enrollmentType: 'free' | 'paid' | 'subscription';
  paymentId?: string;
  transactionId?: string;
  amountPaid: number;
  currency: string;
  completedAt: Date;
  accessGrantedUntil?: Date;
  certificateEligible: boolean;
  enrollmentBenefits: {
    accessToCommunity: boolean;
    downloadableResources: boolean;
    certificateOfCompletion: boolean;
    lifetimeAccess: boolean;
  };
}

export class CourseEnrollmentCompletedEvent extends DomainEvent {
  constructor(
    private readonly payload: CourseEnrollmentCompletedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(
      payload.enrollmentId,
      'CourseEnrollment',
      1,
      {
        ...metadata,
        userId: payload.userId,
        correlationId: metadata.correlationId,
      },
    );
  }

  getPayload(): CourseEnrollmentCompletedPayload {
    return this.payload;
  }

  static fromJSON(data: any): CourseEnrollmentCompletedEvent {
    return new CourseEnrollmentCompletedEvent(data.payload, data.metadata);
  }
}
