import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly suspiciousActivities = new Map<string, number>();
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(private configService: ConfigService) {}

  generateCsrfToken(headers: any) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    return {
      token,
      expires,
      message: 'CSRF token generated successfully',
    };
  }

  validateRequest(body: any, headers: any, ip: string, req: any) {
    const validation = {
      isValid: true,
      warnings: [],
      securityScore: 100,
      checks: {
        contentType: this.checkContentType(headers['content-type']),
        contentLength: this.checkContentLength(headers['content-length']),
        suspiciousPatterns: this.checkForSuspiciousPatterns(body),
        rateLimit: this.checkRateLimit(ip),
        ipReputation: this.checkIpReputation(ip),
      },
    };

    // Calculate overall security score
    validation.securityScore =
      Object.values(validation.checks)
        .filter((check) => typeof check === 'object' && check.score !== undefined)
        .reduce((sum: number, check: any) => sum + check.score, 0) / 4;

    validation.isValid = validation.securityScore >= 70;

    return validation;
  }

  getSecurityHeaders() {
    return {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  getRateLimitInfo(ip: string) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const rateLimitData = this.rateLimitStore.get(ip);

    if (!rateLimitData || rateLimitData.resetTime < now) {
      return {
        limit: 1000,
        remaining: 1000,
        resetTime: now + 60000,
        windowStart,
      };
    }

    return {
      limit: 1000,
      remaining: Math.max(0, 1000 - rateLimitData.count),
      resetTime: rateLimitData.resetTime,
      windowStart,
    };
  }

  reportSuspiciousActivity(reportData: { type: string; description: string; evidence?: any }) {
    this.logger.warn(`Suspicious activity reported: ${reportData.type}`, {
      description: reportData.description,
      evidence: reportData.evidence,
      timestamp: new Date().toISOString(),
    });

    // Store for analysis
    const key = `${reportData.type}_${Date.now()}`;
    this.suspiciousActivities.set(key, Date.now());

    return {
      success: true,
      message: 'Suspicious activity reported and logged',
      id: key,
    };
  }

  private checkContentType(contentType: string) {
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ];

    if (!contentType) {
      return { valid: true, score: 90, message: 'No content-type header' };
    }

    const isValid = allowedTypes.some((type) => contentType.includes(type));
    return {
      valid: isValid,
      score: isValid ? 100 : 50,
      message: isValid ? 'Content type is valid' : 'Suspicious content type',
    };
  }

  private checkContentLength(contentLength: string) {
    const length = parseInt(contentLength || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (length === 0) {
      return { valid: true, score: 95, message: 'No content length specified' };
    }

    const isValid = length <= maxSize;
    const score = isValid ? 100 : Math.max(0, 100 - (length / maxSize) * 50);

    return {
      valid: isValid,
      score,
      message: isValid ? 'Content length is acceptable' : 'Content length too large',
    };
  }

  private checkForSuspiciousPatterns(body: any) {
    if (!body || typeof body !== 'object') {
      return { valid: true, score: 100, message: 'No body to check' };
    }

    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /window\.location/gi,
    ];

    const bodyString = JSON.stringify(body);
    let suspiciousCount = 0;

    for (const pattern of suspiciousPatterns) {
      const matches = bodyString.match(pattern);
      if (matches) {
        suspiciousCount += matches.length;
      }
    }

    const score = Math.max(0, 100 - suspiciousCount * 20);

    return {
      valid: suspiciousCount === 0,
      score,
      message:
        suspiciousCount === 0
          ? 'No suspicious patterns detected'
          : `Found ${suspiciousCount} suspicious patterns`,
      patterns: suspiciousCount,
    };
  }

  private checkRateLimit(ip: string) {
    const now = Date.now();
    const rateLimitData = this.rateLimitStore.get(ip);

    if (!rateLimitData || rateLimitData.resetTime < now) {
      return { valid: true, score: 100, message: 'Rate limit not exceeded' };
    }

    const isValid = rateLimitData.count < 1000;
    const score = isValid ? 100 : Math.max(0, 100 - (rateLimitData.count / 1000) * 50);

    return {
      valid: isValid,
      score,
      message: isValid
        ? 'Rate limit acceptable'
        : `Rate limit exceeded: ${rateLimitData.count}/1000`,
      count: rateLimitData.count,
    };
  }

  private checkIpReputation(ip: string) {
    // Basic IP validation - in production, integrate with IP reputation service
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
    ];

    const isPrivate = privateRanges.some((range) => range.test(ip));
    const isLocalhost = ip === '::1' || ip === 'localhost';

    if (isPrivate || isLocalhost) {
      return { valid: true, score: 100, message: 'Private/local IP address' };
    }

    // For public IPs, assume good reputation (in production, check against blacklist)
    return { valid: true, score: 95, message: 'Public IP address' };
  }

  // Cleanup old data
  cleanup() {
    const now = Date.now();

    // Clean up suspicious activities older than 24 hours
    for (const [key, timestamp] of this.suspiciousActivities.entries()) {
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        this.suspiciousActivities.delete(key);
      }
    }

    // Clean up expired rate limit entries
    for (const [ip, data] of this.rateLimitStore.entries()) {
      if (data.resetTime < now) {
        this.rateLimitStore.delete(ip);
      }
    }
  }
}
