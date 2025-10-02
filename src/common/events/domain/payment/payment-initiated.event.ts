import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface PaymentInitiatedPayload {
  paymentId: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'stellar' | 'crypto';
  paymentProvider: string;
  description: string;
  metadata: {
    courseId?: string;
    enrollmentId?: string;
    subscriptionId?: string;
    [key: string]: any;
  };
  initiatedAt: Date;
  expiresAt?: Date;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export class PaymentInitiatedEvent extends DomainEvent {
  constructor(
    private readonly payload: PaymentInitiatedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(payload.paymentId, 'Payment', 1, {
      ...metadata,
      userId: payload.userId,
      correlationId: metadata.correlationId,
    });
  }

  getPayload(): PaymentInitiatedPayload {
    return this.payload;
  }

  static fromJSON(data: any): PaymentInitiatedEvent {
    return new PaymentInitiatedEvent(data.payload, data.metadata);
  }
}
