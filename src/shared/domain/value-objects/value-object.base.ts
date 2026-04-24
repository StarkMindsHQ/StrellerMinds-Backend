/**
 * Base class for Value Objects
 * Value objects are immutable, identified by their attributes
 * Examples: Email, Password, Money, etc.
 */
export abstract class ValueObject<T = any> {
  protected readonly value: T;

  constructor(value: T) {
    this.validate(value);
    this.value = value;
  }

  /**
   * Override this method to implement custom validation
   */
  protected abstract validate(value: T): void;

  /**
   * Get the primitive value of the value object
   */
  getValue(): T {
    return this.value;
  }

  /**
   * Check equality between two value objects
   */
  abstract equals(other: ValueObject<T>): boolean;

  /**
   * Get string representation
   */
  abstract toString(): string;
}
