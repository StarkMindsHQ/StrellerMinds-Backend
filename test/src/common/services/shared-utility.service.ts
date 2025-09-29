import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class SharedUtilityService {
  private readonly logger = new Logger(SharedUtilityService.name);
  private readonly maxRecursionDepth = 100;
  private readonly maxObjectSize = 1000000; // 1MB limit for safety

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a random string of specified length
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Sanitize input string to prevent injection attacks
   * Note: For production use, consider using a dedicated sanitization library like DOMPurify
   */
  sanitizeInput(input: string): string {
    if (!input) return input;
    
    // Basic XSS protection - remove script tags and dangerous attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*>/gi, '')
      .replace(/<meta\b[^<]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .trim();
  }

  /**
   * Format date to ISO string with timezone
   */
  formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateInput: string | Date | number): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    if (typeof dateInput === 'number') {
      return new Date(dateInput);
    }
    
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date format');
    }
    
    return parsed;
  }

  /**
   * Deep clone an object with stack overflow protection
   */
  deepClone<T>(obj: T, depth = 0): T {
    // Check recursion depth to prevent stack overflow
    if (depth > this.maxRecursionDepth) {
      this.logger.warn(`Deep clone reached maximum recursion depth (${this.maxRecursionDepth})`);
      throw new BadRequestException('Object too deeply nested for safe cloning');
    }

    // Check object size to prevent memory issues
    const objSize = JSON.stringify(obj).length;
    if (objSize > this.maxObjectSize) {
      this.logger.warn(`Object too large for safe cloning (${objSize} bytes)`);
      throw new BadRequestException('Object too large for safe cloning');
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item, depth + 1)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key], depth + 1);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * Merge objects with deep merge strategy and stack overflow protection
   */
  deepMerge<T>(target: T, source: Partial<T>, depth = 0): T {
    // Check recursion depth to prevent stack overflow
    if (depth > this.maxRecursionDepth) {
      this.logger.warn(`Deep merge reached maximum recursion depth (${this.maxRecursionDepth})`);
      throw new BadRequestException('Objects too deeply nested for safe merging');
    }

    const result = this.deepClone(target);
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key], source[key], depth + 1);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Convert object keys to camelCase (recursively)
   */
  toCamelCase(obj: Record<string, any>, depth = 0): Record<string, any> {
    // Check recursion depth to prevent stack overflow
    if (depth > this.maxRecursionDepth) {
      this.logger.warn(`toCamelCase reached maximum recursion depth (${this.maxRecursionDepth})`);
      throw new BadRequestException('Object too deeply nested for safe transformation');
    }

    const camelCaseObj: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // Recursively transform nested objects
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          camelCaseObj[camelKey] = this.toCamelCase(obj[key], depth + 1);
        } else if (Array.isArray(obj[key])) {
          // Transform array elements if they are objects
          camelCaseObj[camelKey] = obj[key].map(item => 
            item && typeof item === 'object' && !(item instanceof Date) 
              ? this.toCamelCase(item, depth + 1) 
              : item
          );
        } else {
          camelCaseObj[camelKey] = obj[key];
        }
      }
    }
    
    return camelCaseObj;
  }

  /**
   * Convert object keys to snake_case (recursively)
   */
  toSnakeCase(obj: Record<string, any>, depth = 0): Record<string, any> {
    // Check recursion depth to prevent stack overflow
    if (depth > this.maxRecursionDepth) {
      this.logger.warn(`toSnakeCase reached maximum recursion depth (${this.maxRecursionDepth})`);
      throw new BadRequestException('Object too deeply nested for safe transformation');
    }

    const snakeCaseObj: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Recursively transform nested objects
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          snakeCaseObj[snakeKey] = this.toSnakeCase(obj[key], depth + 1);
        } else if (Array.isArray(obj[key])) {
          // Transform array elements if they are objects
          snakeCaseObj[snakeKey] = obj[key].map(item => 
            item && typeof item === 'object' && !(item instanceof Date) 
              ? this.toSnakeCase(item, depth + 1) 
              : item
          );
        } else {
          snakeCaseObj[snakeKey] = obj[key];
        }
      }
    }
    
    return snakeCaseObj;
  }

  /**
   * Check if object is empty
   */
  isEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.trim().length === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Remove undefined and null values from object
   */
  removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null) {
        cleaned[key] = obj[key];
      }
    }
    
    return cleaned;
  }

  /**
   * Safely get nested object property with fallback
   */
  safeGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
          return defaultValue;
        }
        result = result[key];
      }
      
      return result !== undefined ? result : defaultValue;
    } catch (error) {
      this.logger.warn(`Error accessing nested property ${path}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Safely set nested object property
   */
  safeSet(obj: any, path: string, value: any): boolean {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
      return true;
    } catch (error) {
      this.logger.error(`Error setting nested property ${path}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a value is a valid UUID
   */
  isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Generate a UUID v4
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Debounce function execution
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function execution
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}
