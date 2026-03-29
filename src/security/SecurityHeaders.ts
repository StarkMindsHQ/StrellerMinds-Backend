import { Injectable, Logger } from '@nestjs/common';

export interface HeaderConfig {
  name: string;
  value: string;
}

@Injectable()
export class SecurityHeaders {
  private readonly logger = new Logger(SecurityHeaders.name);
  private headers: HeaderConfig[] = [];

  constructor() {
    this.initializeHeaders();
  }

  private initializeHeaders() {
    this.logger.log('Initializing dynamic security headers');
    
    this.headers = [
      { name: 'X-Frame-Options', value: 'DENY' },
      { name: 'X-Content-Type-Options', value: 'nosniff' },
      { name: 'X-XSS-Protection', value: '1; mode=block' },
      { name: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { name: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    ];
  }

  /**
   * Retrieves all configured security headers.
   */
  getHeaders(): HeaderConfig[] {
    return this.headers;
  }

  /**
   * Updates or adds a security header.
   */
  setHeader(name: string, value: string): void {
    const existingIndex = this.headers.findIndex((h) => h.name === name);
    if (existingIndex >= 0) {
      this.headers[existingIndex].value = value;
    } else {
      this.headers.push({ name, value });
    }
  }

  /**
   * Removes a security header.
   */
  removeHeader(name: string): void {
    const originalCount = this.headers.length;
    this.headers = this.headers.filter((h) => h.name !== name);
    if (this.headers.length < originalCount) {
      this.logger.warn(`Security header removed: ${name}`);
    }
  }
}
