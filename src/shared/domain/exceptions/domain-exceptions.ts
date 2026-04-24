/**
 * Base domain exception
 * All domain-specific exceptions should extend this class
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DomainException.prototype);
  }

  abstract getCode(): string;
}

/**
 * Thrown when a domain entity is not found
 */
export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id "${id}" not found`);
    Object.setPrototypeOf(this, EntityNotFoundException.prototype);
  }

  getCode(): string {
    return 'ENTITY_NOT_FOUND';
  }
}

/**
 * Thrown when a domain constraint is violated
 */
export class DomainConstraintViolationException extends DomainException {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DomainConstraintViolationException.prototype);
  }

  getCode(): string {
    return 'CONSTRAINT_VIOLATION';
  }
}

/**
 * Thrown when an invalid operation is performed
 */
export class InvalidOperationException extends DomainException {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidOperationException.prototype);
  }

  getCode(): string {
    return 'INVALID_OPERATION';
  }
}
