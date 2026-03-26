import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  buildMessage,
  ValidateBy,
} from 'class-validator';
import { ValidationMessageKeys, ValidationFieldLabels } from './validation-messages.constants';

/**
 * Factory function to get localized validation message
 * This can be injected with i18n service for full localization
 */
let messageResolver: (key: string, args?: Record<string, unknown>) => string = (key, args) => {
  // Default implementation - will be replaced by i18n-aware resolver
  return formatMessage(key, args);
};

/**
 * Set a custom message resolver (for i18n integration)
 */
export function setValidationMessageResolver(
  resolver: (key: string, args?: Record<string, unknown>) => string,
): void {
  messageResolver = resolver;
}

/**
 * Get the current message resolver
 */
export function getValidationMessageResolver(): (
  key: string,
  args?: Record<string, unknown>,
) => string {
  return messageResolver;
}

/**
 * Format a message with arguments
 */
function formatMessage(template: string, args?: Record<string, unknown>): string {
  if (!args) return template;
  let result = template;
  for (const [key, value] of Object.entries(args)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

/**
 * Get message with optional field label substitution
 */
export function getValidationMessage(
  messageKey: string,
  fieldName?: string,
  args?: Record<string, unknown>,
): string {
  const label = fieldName
    ? ValidationFieldLabels[fieldName] || fieldName
    : 'This field';
  
  const allArgs = { field: label, ...args };
  return messageResolver(messageKey, allArgs);
}

// ============================================================================
// User-Friendly Validation Decorators
// ============================================================================

/**
 * Validates that a field is not empty with user-friendly message
 */
export function IsUserFriendlyRequired(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserFriendlyRequired',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          return value !== null && value !== undefined && value !== '';
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.REQUIRED,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates email with user-friendly message
 */
export function IsUserFriendlyEmail(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserFriendlyEmail',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true; // Allow empty - use IsUserFriendlyRequired for required
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.EMAIL,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates minimum length with user-friendly message
 */
export function MinLengthUserFriendly(
  minLength: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'minLengthUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          return typeof value === 'string' && value.length >= minLength;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.MIN_LENGTH,
            String(args.property),
            { min: minLength },
          );
        },
      },
    });
  };
}

/**
 * Validates maximum length with user-friendly message
 */
export function MaxLengthUserFriendly(
  maxLength: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxLengthUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          return typeof value === 'string' && value.length <= maxLength;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.MAX_LENGTH,
            String(args.property),
            { max: maxLength },
          );
        },
      },
    });
  };
}

/**
 * Validates password strength with user-friendly message
 */
export function IsStrongPasswordUserFriendly(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPasswordUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          // At least 8 chars, uppercase, lowercase, number
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
          return passwordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.PASSWORD_STRONG,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates URL format with user-friendly message
 */
export function IsUserFriendlyUrl(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserFriendlyUrl',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.URL,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates phone number format with user-friendly message
 */
export function IsUserFriendlyPhone(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserFriendlyPhone',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          // Accept various phone formats
          const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;
          return phoneRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.PHONE,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates date format with user-friendly message
 */
export function IsUserFriendlyDate(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserFriendlyDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.DATE,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates date is in the future
 */
export function IsFutureDate(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          const date = new Date(value);
          return !isNaN(date.getTime()) && date > new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.DATE_FUTURE,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates date is in the past
 */
export function IsPastDate(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPastDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          const date = new Date(value);
          return !isNaN(date.getTime()) && date < new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.DATE_PAST,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates minimum value with user-friendly message
 */
export function MinValueUserFriendly(
  minValue: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'minValueUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) return true;
          return typeof value === 'number' && value >= minValue;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.MIN_VALUE,
            String(args.property),
            { min: minValue },
          );
        },
      },
    });
  };
}

/**
 * Validates maximum value with user-friendly message
 */
export function MaxValueUserFriendly(
  maxValue: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxValueUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) return true;
          return typeof value === 'number' && value <= maxValue;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.MAX_VALUE,
            String(args.property),
            { max: maxValue },
          );
        },
      },
    });
  };
}

/**
 * Validates value is one of the allowed values with user-friendly message
 */
export function IsOneOfUserFriendly(
  allowedValues: readonly string[] | readonly number[],
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOneOfUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          return (allowedValues as readonly any[]).includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.ENUM,
            String(args.property),
            { values: allowedValues.join(', ') },
          );
        },
      },
    });
  };
}

/**
 * Validates array is not empty with user-friendly message
 */
export function ArrayNotEmptyUserFriendly(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'arrayNotEmptyUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          return Array.isArray(value) && value.length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.ARRAY_NOT_EMPTY,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates username format with user-friendly message
 */
export function IsUsernameUserFriendly(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUsernameUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          // Alphanumeric, underscores, hyphens, 3-30 chars
          const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
          return usernameRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.USERNAME_FORMAT,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates slug format with user-friendly message
 */
export function IsSlugUserFriendly(options?: ValidationOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSlugUserFriendly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value) return true;
          const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
          return slugRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.SLUG_FORMAT,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates that passwords match with user-friendly message
 */
export function PasswordsMatch(
  passwordField: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'passwordsMatch',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const object = args.object as any;
          const password = object[passwordField];
          return value === password;
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.PASSWORD_MATCH,
            String(args.property),
          );
        },
      },
    });
  };
}

/**
 * Validates file size in bytes
 */
export function MaxFileSize(
  maxSizeBytes: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxFileSize',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value || !value.size) return true;
          return value.size <= maxSizeBytes;
        },
        defaultMessage(args: ValidationArguments) {
          const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
          return getValidationMessage(
            ValidationMessageKeys.FILE_SIZE,
            String(args.property),
            { max: `${maxSizeMB}MB` },
          );
        },
      },
    });
  };
}

/**
 * Validates file type/mime type
 */
export function AllowedFileTypes(
  allowedTypes: string[],
  options?: ValidationOptions,
): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'allowedFileTypes',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any) {
          if (!value || !value.mimetype) return true;
          return allowedTypes.some(type => 
            value.mimetype.includes(type) || 
            value.originalname?.toLowerCase().endsWith(type)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return getValidationMessage(
            ValidationMessageKeys.FILE_TYPE,
            String(args.property),
            { types: allowedTypes.join(', ') },
          );
        },
      },
    });
  };
}
