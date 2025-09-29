import { DomainEvent, DomainEventMetadata } from '../../base/domain-event.base';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
  registrationMethod: 'email' | 'google' | 'facebook' | 'apple';
  emailVerified: boolean;
  profileData?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  };
  registrationSource?: string;
  referralCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    private readonly payload: UserRegisteredPayload,
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

  getPayload(): UserRegisteredPayload {
    return this.payload;
  }

  static fromJSON(data: any): UserRegisteredEvent {
    return new UserRegisteredEvent(data.payload, data.metadata);
  }
}
