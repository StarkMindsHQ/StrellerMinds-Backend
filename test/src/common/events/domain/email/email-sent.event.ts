import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface EmailSentPayload {
  emailId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateName: string;
  sentAt: Date;
  messageId: string;
  provider: string;
  deliveryStatus: 'sent' | 'delivered' | 'bounced' | 'failed';
  metadata: {
    source: string;
    category: string;
    tags?: string[];
    processingTime: number;
    retryCount: number;
    [key: string]: any;
  };
}

export class EmailSentEvent extends DomainEvent {
  constructor(
    private readonly payload: EmailSentPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(
      payload.emailId,
      'Email',
      1,
      {
        ...metadata,
        correlationId: metadata.correlationId,
      },
    );
  }

  getPayload(): EmailSentPayload {
    return this.payload;
  }

  static fromJSON(data: any): EmailSentEvent {
    return new EmailSentEvent(data.payload, data.metadata);
  }
}
