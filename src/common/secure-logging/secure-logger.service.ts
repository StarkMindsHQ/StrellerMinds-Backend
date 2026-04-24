import { Injectable, LoggerService } from '@nestjs/common';

/**
 * Configuration for sensitive data sanitization
 */
export interface SecureLoggerConfig {
  /**
   * Fields to sanitize in objects (case-insensitive)
   */
  sensitiveFields: string[];
  
  /**
   * Replacement value for sensitive data
   */
  replacementValue: string;
  
  /**
   * Whether to enable secure logging
   */
  enabled: boolean;
  
  /**
   * Maximum depth for object sanitization
   */
  maxDepth: number;
}

/**
 * Default configuration for secure logging
 */
const DEFAULT_CONFIG: SecureLoggerConfig = {
  sensitiveFields: [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'auth',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'socialSecurity',
    'dateOfBirth',
    'dob',
    'phoneNumber',
    'phone',
    'address',
    'bankAccount',
    'routingNumber',
    'pin',
    'otp',
    'oneTimePassword',
    'verificationCode',
    'resetToken',
    'resetCode',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'oldPassword',
  ],
  replacementValue: '[REDACTED]',
  enabled: true,
  maxDepth: 5,
};

/**
 * Secure Logger Service that prevents sensitive data from being logged
 * 
 * This service automatically sanitizes sensitive fields like passwords,
 * tokens, PII, and other confidential data before logging.
 */
@Injectable()
export class SecureLoggerService implements LoggerService {
  private readonly config: SecureLoggerConfig;
  private readonly defaultLogger: LoggerService;

  constructor(config?: Partial<SecureLoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.defaultLogger = new (class implements LoggerService {
      log(message: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
      }
      error(message: any, ...optionalParams: any[]) {
        console.error(message, ...optionalParams);
      }
      warn(message: any, ...optionalParams: any[]) {
        console.warn(message, ...optionalParams);
      }
      debug(message: any, ...optionalParams: any[]) {
        console.debug(message, ...optionalParams);
      }
      verbose(message: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
      }
    })();
  }

  /**
   * Log a message with sanitized data
   */
  log(message: any, ...optionalParams: any[]) {
    if (!this.config.enabled) {
      this.defaultLogger.log(message, ...optionalParams);
      return;
    }

    const sanitizedMessage = this.sanitize(message);
    const sanitizedParams = optionalParams.map(param => this.sanitize(param));
    this.defaultLogger.log(sanitizedMessage, ...sanitizedParams);
  }

  /**
   * Log an error with sanitized data
   */
  error(message: any, ...optionalParams: any[]) {
    if (!this.config.enabled) {
      this.defaultLogger.error(message, ...optionalParams);
      return;
    }

    const sanitizedMessage = this.sanitize(message);
    const sanitizedParams = optionalParams.map(param => this.sanitize(param));
    this.defaultLogger.error(sanitizedMessage, ...sanitizedParams);
  }

  /**
   * Log a warning with sanitized data
   */
  warn(message: any, ...optionalParams: any[]) {
    if (!this.config.enabled) {
      this.defaultLogger.warn(message, ...optionalParams);
      return;
    }

    const sanitizedMessage = this.sanitize(message);
    const sanitizedParams = optionalParams.map(param => this.sanitize(param));
    this.defaultLogger.warn(sanitizedMessage, ...sanitizedParams);
  }

  /**
   * Log a debug message with sanitized data
   */
  debug(message: any, ...optionalParams: any[]) {
    if (!this.config.enabled) {
      this.defaultLogger.debug(message, ...optionalParams);
      return;
    }

    const sanitizedMessage = this.sanitize(message);
    const sanitizedParams = optionalParams.map(param => this.sanitize(param));
    this.defaultLogger.debug(sanitizedMessage, ...sanitizedParams);
  }

  /**
   * Log a verbose message with sanitized data
   */
  verbose(message: any, ...optionalParams: any[]) {
    if (!this.config.enabled) {
      this.defaultLogger.verbose(message, ...optionalParams);
      return;
    }

    const sanitizedMessage = this.sanitize(message);
    const sanitizedParams = optionalParams.map(param => this.sanitize(param));
    this.defaultLogger.verbose(sanitizedMessage, ...sanitizedParams);
  }

  /**
   * Sanitize sensitive data from any value
   */
  private sanitize(value: any, depth: number = 0): any {
    if (!this.config.enabled) {
      return value;
    }

    // Prevent infinite recursion
    if (depth > this.config.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings - check if it looks like a token or sensitive value
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.sanitize(item, depth + 1));
    }

    // Handle objects
    if (typeof value === 'object') {
      return this.sanitizeObject(value, depth);
    }

    // Handle other types (number, boolean, etc.)
    return value;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string): string {
    // Check if string looks like a JWT token
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return '[JWT_TOKEN_REDACTED]';
    }

    // Check if string looks like a bearer token
    if (/^Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/i.test(value)) {
      return '[BEARER_TOKEN_REDACTED]';
    }

    // Check if string looks like a UUID (might be a token)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      // Don't redact all UUIDs, they might be legitimate IDs
      // Only redact if it's very long or appears to be a token
      if (value.length > 36) {
        return '[UUID_REDACTED]';
      }
    }

    return value;
  }

  /**
   * Sanitize an object by redacting sensitive fields
   */
  private sanitizeObject(obj: any, depth: number): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return obj;
    }

    // Handle Buffer
    if (Buffer.isBuffer(obj)) {
      return '[BUFFER_REDACTED]';
    }

    // Handle RegExp
    if (obj instanceof RegExp) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if this field should be sanitized
      const isSensitive = this.config.sensitiveFields.some(
        sensitiveField => lowerKey.includes(sensitiveField.toLowerCase())
      );

      if (isSensitive) {
        // Sanitize sensitive fields
        if (typeof value === 'string' && value.length > 0) {
          // Show first and last 2 characters for context, mask the rest
          if (value.length <= 6) {
            sanitized[key] = this.config.replacementValue;
          } else {
            sanitized[key] = `${value.substring(0, 2)}${'*'.repeat(Math.min(value.length - 4, 10))}${value.substring(value.length - 2)}`;
          }
        } else {
          sanitized[key] = this.config.replacementValue;
        }
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitize(value, depth + 1);
      }
    }

    return sanitized;
  }

  /**
   * Create a child logger with a specific context
   */
  setContext(context: string): SecureLoggerService {
    const childLogger = new SecureLoggerService(this.config);
    return childLogger;
  }

  /**
   * Check if a field name is considered sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(
      sensitiveField => lowerField.includes(sensitiveField.toLowerCase())
    );
  }

  /**
   * Get the current configuration
   */
  getConfig(): SecureLoggerConfig {
    return { ...this.config };
  }
}
