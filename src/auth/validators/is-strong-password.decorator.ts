import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PasswordValidator } from './password.validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: any): boolean {
    if (typeof password !== 'string') {
      return false;
    }
    return PasswordValidator.isValid(password);
  }

  defaultMessage(args: ValidationArguments) {
    const password = args.value;
    if (typeof password !== 'string') {
      return 'Password must be a string';
    }

    const result = PasswordValidator.validate(password);
    if (result.errors.length > 0) {
      return result.errors[0];
    }
    return 'Password does not meet strength requirements';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
