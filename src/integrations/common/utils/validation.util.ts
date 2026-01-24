import { BadRequestException } from '@nestjs/common';

export class ValidationUtil {
  static validateJWT(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return !!payload;
    } catch {
      return false;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validateCredentials(credentials: any, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }
    return true;
  }

  static sanitizeCredentials(credentials: any): any {
    const sanitized = { ...credentials };
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'refreshToken'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }
    return sanitized;
  }

  static validateISODate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
