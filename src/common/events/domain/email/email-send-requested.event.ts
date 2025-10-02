import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface EmailSendRequestedPayload {
  emailId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  templateName: string;
  templateData: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
  attachments?: {
    filename: string;
    content: string | Buffer;
    contentType: string;
  }[];
  metadata: {
    source: string;
    category: string;
    tags?: string[];
    trackingEnabled: boolean;
    [key: string]: any;
  };
}

export class EmailSendRequestedEvent extends DomainEvent {
  constructor(
    private readonly payload: EmailSendRequestedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(payload.emailId, 'Email', 1, {
      ...metadata,
      correlationId: metadata.correlationId,
    });
  }

  getPayload(): EmailSendRequestedPayload {
    return this.payload;
  }

  static fromJSON(data: any): EmailSendRequestedEvent {
    return new EmailSendRequestedEvent(data.payload, data.metadata);
  }
}
