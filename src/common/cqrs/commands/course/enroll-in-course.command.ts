import { Command, CommandMetadata } from '../../base/command.base';

export interface EnrollInCoursePayload {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'subscription';
  paymentMethod?: 'stripe' | 'stellar' | 'crypto';
  discountCode?: string;
  enrollmentSource?: string;
  referralCode?: string;
  paymentDetails?: {
    amount: number;
    currency: string;
    paymentMethodId?: string;
    billingAddress?: any;
  };
}

export class EnrollInCourseCommand extends Command {
  constructor(
    private readonly payload: EnrollInCoursePayload,
    metadata: Partial<CommandMetadata> = {},
  ) {
    super(metadata);
  }

  validate(): void {
    if (!this.payload.userId) {
      throw new Error('User ID is required');
    }

    if (!this.payload.courseId) {
      throw new Error('Course ID is required');
    }

    if (!['free', 'paid', 'subscription'].includes(this.payload.enrollmentType)) {
      throw new Error('Invalid enrollment type');
    }

    if (this.payload.enrollmentType === 'paid' && !this.payload.paymentMethod) {
      throw new Error('Payment method is required for paid enrollment');
    }

    if (this.payload.enrollmentType === 'paid' && !this.payload.paymentDetails) {
      throw new Error('Payment details are required for paid enrollment');
    }

    if (this.payload.paymentDetails) {
      if (!this.payload.paymentDetails.amount || this.payload.paymentDetails.amount <= 0) {
        throw new Error('Valid payment amount is required');
      }

      if (!this.payload.paymentDetails.currency) {
        throw new Error('Payment currency is required');
      }
    }

    if (
      this.payload.paymentMethod &&
      !['stripe', 'stellar', 'crypto'].includes(this.payload.paymentMethod)
    ) {
      throw new Error('Invalid payment method');
    }
  }

  getPayload(): EnrollInCoursePayload {
    return this.payload;
  }
}
