import { Command, CommandMetadata } from '../../base/command.base';

export interface RegisterUserPayload {
  email: string;
  password: string;
  name: string;
  registrationMethod: 'email' | 'google' | 'facebook' | 'apple';
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
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  marketingOptIn?: boolean;
}

export class RegisterUserCommand extends Command {
  constructor(
    private readonly payload: RegisterUserPayload,
    metadata: Partial<CommandMetadata> = {},
  ) {
    super(metadata);
  }

  validate(): void {
    if (!this.payload.email) {
      throw new Error('Email is required');
    }

    if (!this.payload.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (!this.payload.password) {
      throw new Error('Password is required');
    }

    if (this.payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!this.payload.name) {
      throw new Error('Name is required');
    }

    if (!this.payload.acceptedTerms) {
      throw new Error('Terms of service must be accepted');
    }

    if (!this.payload.acceptedPrivacyPolicy) {
      throw new Error('Privacy policy must be accepted');
    }

    if (!['email', 'google', 'facebook', 'apple'].includes(this.payload.registrationMethod)) {
      throw new Error('Invalid registration method');
    }
  }

  getPayload(): RegisterUserPayload {
    return this.payload;
  }
}
