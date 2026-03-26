import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  UnprocessableEntityException,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ErrorCode, ErrorDetail, ErrorSeverity, ErrorCategory } from '../errors/error-types';
import { ValidationMessageKeys, ValidationFieldLabels, DefaultValidationMessages } from './validation-messages.constants';
import { I18nService } from '../../i18n/services/i18n.service';

/**
 * Options for the user-friendly validation pipe
 */
export interface UserFriendlyValidationPipeOptions extends ValidationPipeOptions {
  /** Whether to translate validation messages */
  enableTranslation?: boolean;
  /** Custom field label mappings */
  fieldLabels?: Record<string, string>;
  /** Whether to include detailed error information */
  includeDetails?: boolean;
}

/**
 * Transforms class-validator errors into user-friendly validation messages
 * with localization support
 */
@Injectable()
export class UserFriendlyValidationPipe extends ValidationPipe implements PipeTransform {
  private readonly enableTranslation: boolean;
  private readonly customFieldLabels: Record<string, string>;
  private readonly includeDetails: boolean;
  private i18nService?: I18nService;

  constructor(options: UserFriendlyValidationPipeOptions = {}) {
    const {
      enableTranslation = true,
      fieldLabels = {},
      includeDetails = false,
      ...validationPipeOptions
    } = options;

    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      forbidUnknownValues: true,
      ...validationPipeOptions,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException({
          errorCode: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed. Please check your input.',
          errors: [],
        });
      },
    });

    this.enableTranslation = enableTranslation;
    this.customFieldLabels = { ...ValidationFieldLabels, ...fieldLabels };
    this.includeDetails = includeDetails;
  }

  /**
   * Set the i18n service for translation
   */
  setI18nService(i18nService: I18nService): void {
    this.i18nService = i18nService;
  }

  /**
   * Transform and validate input
   */
  async transform(value: any, metadata: ArgumentMetadata) {
    try {
      return await super.transform(value, metadata);
    } catch (error: any) {
      if (error instanceof UnprocessableEntityException) {
        const response = error.getResponse() as any;
        
        // If this is our validation error with the right structure
        if (response?.errorCode === ErrorCode.VALIDATION_ERROR) {
          // Extract language from metadata or use default
          const language = (value as any)?._language || 'en';
          
          // Get the actual validation errors from the parent
          const validationErrors = this.getValidationErrors(value, metadata);
          const errorDetails = this.formatErrors(validationErrors, language);
          
          throw new UnprocessableEntityException({
            success: false,
            errorCode: ErrorCode.VALIDATION_ERROR,
            message: this.getLocalizedMessage('validation.failed', language, 'Validation failed. Please check your input.'),
            statusCode: 422,
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.VALIDATION,
            errors: errorDetails,
            timestamp: new Date().toISOString(),
          });
        }
      }
      throw error;
    }
  }

  /**
   * Get validation errors from the value
   */
  private getValidationErrors(value: any, metadata: ArgumentMetadata): ValidationError[] {
    // This is a simplified version - the actual validation is done by the parent
    return [];
  }

  /**
   * Format validation errors into user-friendly error details
   */
  formatErrors(errors: ValidationError[], language: string = 'en'): ErrorDetail[] {
    const details: ErrorDetail[] = [];

    for (const error of errors) {
      // Process this error
      const fieldLabel = this.getFieldLabel(error.property);
      
      if (error.constraints) {
        for (const [constraintName, constraintMessage] of Object.entries(error.constraints)) {
          const errorDetail = this.createErrorDetail(
            error.property,
            constraintName,
            constraintMessage,
            fieldLabel,
            language,
          );
          details.push(errorDetail);
        }
      }

      // Process nested errors (for nested objects/arrays)
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatErrors(error.children, language);
        details.push(...nestedErrors);
      }
    }

    return details;
  }

  /**
   * Create an error detail from a constraint
   */
  private createErrorDetail(
    field: string,
    constraintName: string,
    originalMessage: string,
    fieldLabel: string,
    language: string,
  ): ErrorDetail {
    // Map constraint name to message key
    const messageKey = this.mapConstraintToMessageKey(constraintName);
    
    // Get localized message
    let message = this.getLocalizedMessage(messageKey, language, originalMessage, {
      field: fieldLabel,
    });

    // Extract any additional context from the original message
    const context = this.extractConstraintContext(constraintName, originalMessage);
    if (context) {
      message = this.interpolateMessage(message, context);
    }

    return {
      field,
      code: this.normalizeErrorCode(constraintName),
      message,
      suggestion: this.getSuggestion(constraintName, field),
    };
  }

  /**
   * Map constraint name to message key
   */
  private mapConstraintToMessageKey(constraintName: string): string {
    const mapping: Record<string, string> = {
      isNotEmpty: ValidationMessageKeys.REQUIRED,
      isDefined: ValidationMessageKeys.REQUIRED,
      isEmail: ValidationMessageKeys.EMAIL,
      min: ValidationMessageKeys.MIN_VALUE,
      max: ValidationMessageKeys.MAX_VALUE,
      minLength: ValidationMessageKeys.MIN_LENGTH,
      maxLength: ValidationMessageKeys.MAX_LENGTH,
      isStrongPassword: ValidationMessageKeys.PASSWORD_STRONG,
      matches: ValidationMessageKeys.STRING_FORMAT,
      isUrl: ValidationMessageKeys.URL,
      isPhoneNumber: ValidationMessageKeys.PHONE,
      isDate: ValidationMessageKeys.DATE,
      isDateString: ValidationMessageKeys.DATE,
      isBoolean: ValidationMessageKeys.BOOLEAN,
      isEnum: ValidationMessageKeys.ENUM,
      isNumber: ValidationMessageKeys.INTEGER,
      isInt: ValidationMessageKeys.INTEGER,
      isPositive: ValidationMessageKeys.POSITIVE_NUMBER,
      arrayNotEmpty: ValidationMessageKeys.ARRAY_NOT_EMPTY,
      arrayMaxSize: ValidationMessageKeys.ARRAY_MAX_SIZE,
      arrayMinSize: ValidationMessageKeys.ARRAY_MIN_SIZE,
    };

    return mapping[constraintName] || ValidationMessageKeys.STRING_FORMAT;
  }

  /**
   * Get localized message
   */
  private getLocalizedMessage(
    key: string,
    language: string,
    fallback: string,
    args?: Record<string, unknown>,
  ): string {
    if (this.enableTranslation && this.i18nService) {
      const translationKey = key;
      const translated = this.i18nService.translate(translationKey, language, args);
      
      // If translation found (not returning the key itself)
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    // Use default message
    const defaultMessage = DefaultValidationMessages[key];
    if (defaultMessage) {
      return this.interpolateMessage(defaultMessage, args || {});
    }

    return fallback;
  }

  /**
   * Get field label
   */
  private getFieldLabel(fieldName: string): string {
    return this.customFieldLabels[fieldName] || fieldName;
  }

  /**
   * Interpolate message with arguments
   */
  private interpolateMessage(message: string, args: Record<string, unknown>): string {
    let result = message;
    for (const [key, value] of Object.entries(args)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  /**
   * Extract context from constraint message
   */
  private extractConstraintContext(
    constraintName: string,
    message: string,
  ): Record<string, unknown> | null {
    // Extract numbers from messages like "must be longer than 8 characters"
    const minLengthMatch = message.match(/(\d+)/);
    if (constraintName === 'minLength' && minLengthMatch) {
      return { min: minLengthMatch[1] };
    }
    if (constraintName === 'maxLength' && minLengthMatch) {
      return { max: minLengthMatch[1] };
    }
    if (constraintName === 'min' && minLengthMatch) {
      return { min: minLengthMatch[1] };
    }
    if (constraintName === 'max' && minLengthMatch) {
      return { max: minLengthMatch[1] };
    }

    return null;
  }

  /**
   * Normalize error code from constraint name
   */
  private normalizeErrorCode(constraintName: string): string {
    return constraintName
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^IS_/, '')
      .replace(/_NOT_EMPTY$/, '_REQUIRED');
  }

  /**
   * Get suggestion for fixing the validation error
   */
  private getSuggestion(constraintName: string, field: string): string | undefined {
    const suggestions: Record<string, string> = {
      isEmail: 'Enter a valid email address like user@example.com',
      isStrongPassword: 'Include uppercase, lowercase, and numbers in your password',
      minLength: 'Add more characters to meet the minimum length',
      maxLength: 'Shorten your input to meet the maximum length',
      isUrl: 'Make sure to include https:// or http://',
      isPhoneNumber: 'Include your country code for international numbers',
      isDate: 'Use a standard date format like YYYY-MM-DD',
    };

    return suggestions[constraintName];
  }
}

/**
 * Factory function to create a configured validation pipe
 */
export function createUserFriendlyValidationPipe(
  options?: UserFriendlyValidationPipeOptions,
): UserFriendlyValidationPipe {
  return new UserFriendlyValidationPipe(options);
}

/**
 * Utility function to format a single validation error
 */
export function formatValidationError(
  error: ValidationError,
  language: string = 'en',
): ErrorDetail {
  const fieldLabel = ValidationFieldLabels[error.property] || error.property;
  const constraintName = Object.keys(error.constraints || {})[0] || 'unknown';
  const message = Object.values(error.constraints || {})[0] || 'Invalid value';

  const messageKey = new Map([
    ['isNotEmpty', ValidationMessageKeys.REQUIRED],
    ['isEmail', ValidationMessageKeys.EMAIL],
    ['minLength', ValidationMessageKeys.MIN_LENGTH],
    ['maxLength', ValidationMessageKeys.MAX_LENGTH],
  ]).get(constraintName) || ValidationMessageKeys.STRING_FORMAT;

  let finalMessage = DefaultValidationMessages[messageKey] || message;
  finalMessage = finalMessage.replace(/{{field}}/g, fieldLabel);

  return {
    field: error.property,
    code: constraintName.toUpperCase(),
    message: finalMessage,
  };
}
