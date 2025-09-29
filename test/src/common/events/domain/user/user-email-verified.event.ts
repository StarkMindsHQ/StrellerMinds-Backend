import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface UserEmailVerifiedPayload {
  userId: string;
  email: string;
  verificationToken: string;
  verifiedAt: Date;
  verificationMethod: 'email_link' | 'verification_code';
  ipAddress?: string;
  userAgent?: string;
}

export class UserEmailVerifiedEvent extends DomainEvent {
  constructor(
    private readonly payload: UserEmailVerifiedPayload,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    super(
      payload.userId,
      'User',
      1,
      {
        ...metadata,
        userId: payload.userId,
        correlationId: metadata.correlationId,
      },
    );
  }

  getPayload(): UserEmailVerifiedPayload {
    return this.payload;
  }

  static fromJSON(data: any): UserEmailVerifiedEvent {
    return new UserEmailVerifiedEvent(data.payload, data.metadata);
  }
}
