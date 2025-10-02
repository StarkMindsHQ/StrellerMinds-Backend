import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface PaymentCompletedPayload {
  paymentId: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'stellar' | 'crypto';
  paymentProvider: string;
  transactionId: string;
  providerTransactionId: string;
  completedAt: Date;
  fees: {
    platformFee: number;
    processingFee: number;
    totalFees: number;
  };
  metadata: {
    courseId?: string;
    enrollmentId?: string;
    subscriptionId?: string;
    [key: string]: any;
  };
  receiptUrl?: string;
  invoiceId?: string;
}

export class PaymentCompletedEvent extends DomainEvent {
  constructor(
    private readonly payload: PaymentCompletedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(payload.paymentId, 'Payment', 1, {
      ...metadata,
      userId: payload.userId,
      correlationId: metadata.correlationId,
    });
  }

  getPayload(): PaymentCompletedPayload {
    return this.payload;
  }

  static fromJSON(data: any): PaymentCompletedEvent {
    return new PaymentCompletedEvent(data.payload, data.metadata);
  }
}
