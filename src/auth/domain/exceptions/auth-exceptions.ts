import { DomainException } from '../../../shared/domain/exceptions/domain-exceptions';

/**
 * Thrown when a user attempts to login with invalid credentials
 */
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password');
    Object.setPrototypeOf(this, InvalidCredentialsException.prototype);
  }

  getCode(): string {
    return 'INVALID_CREDENTIALS';
  }
}

/**
 * Thrown when a user attempts to register with an email that already exists
 */
export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email "${email}" already exists`);
    Object.setPrototypeOf(this, UserAlreadyExistsException.prototype);
  }

  getCode(): string {
    return 'USER_ALREADY_EXISTS';
  }
}

/**
 * Thrown when a user is not found
 */
export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`User with id "${userId}" not found`);
    Object.setPrototypeOf(this, UserNotFoundException.prototype);
  }

  getCode(): string {
    return 'USER_NOT_FOUND';
  }
}

/**
 * Thrown when password strength validation fails
 */
export class PasswordStrengthException extends DomainException {
  private readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`Password does not meet strength requirements: ${reasons.join(', ')}`);
    this.reasons = reasons;
    Object.setPrototypeOf(this, PasswordStrengthException.prototype);
  }

  getCode(): string {
    return 'PASSWORD_STRENGTH_FAILED';
  }

  getReasons(): string[] {
    return this.reasons;
  }
}

/**
 * Thrown when email verification fails
 */
export class EmailVerificationException extends DomainException {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, EmailVerificationException.prototype);
  }

  getCode(): string {
    return 'EMAIL_VERIFICATION_FAILED';
  }
}
