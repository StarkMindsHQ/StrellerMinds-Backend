import { ValueObject } from './value-object.base';
import { DomainConstraintViolationException } from '../exceptions/domain-exceptions';

/**
 * Email value object (issue #840 - DDD).
 * Encapsulates email validation and normalization.
 */
export class Email extends ValueObject<string> {
  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected validate(value: string): void {
    if (!value || !Email.REGEX.test(value)) {
      throw new DomainConstraintViolationException(`Invalid email: "${value}"`);
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  equals(other: ValueObject<string>): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
