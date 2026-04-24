import { DomainException } from '../../../shared/domain/exceptions/domain-exceptions';

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
 * Thrown when user data is invalid
 */
export class InvalidUserDataException extends DomainException {
  constructor(message: string) {
    super(`Invalid user data: ${message}`);
    Object.setPrototypeOf(this, InvalidUserDataException.prototype);
  }

  getCode(): string {
    return 'INVALID_USER_DATA';
  }
}
