import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OpenAPIValidationService, ValidationResult } from './openapi-validation.service';
import { ContractViolationReporterService } from './contract-violation-reporter.service';

/**
 * OpenAPI Validation Middleware
 *
 * Automatically validates all incoming requests and outgoing responses
 * against the OpenAPI specification.
 *
 * Features:
 * - Automatic request validation
 * - Automatic response validation
 * - Error reporting and logging
 * - Performance monitoring
 * - Configurable validation rules
 */

@Injectable()
export class OpenAPIValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OpenAPIValidationMiddleware.name);

  constructor(
    private readonly openApiValidation: OpenAPIValidationService,
    private readonly violationReporter: ContractViolationReporterService,
  ) {}

  /**
   * Middleware handler for request/response validation
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path;

    try {
      // Validate incoming request
      const requestValidation = this.validateRequest(req);

      // Store original res.json and res.send methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Override response methods to validate responses
      res.json = (data: any) => {
        this.validateResponse(method, path, res.statusCode, res.getHeaders(), data);
        return originalJson(data);
      };

      res.send = (data: any) => {
        this.validateResponse(method, path, res.statusCode, res.getHeaders(), data);
        return originalSend(data);
      };

      // Add validation metadata to request
      (req as any).validation = {
        request: requestValidation,
        startTime,
      };

      // Report violations if any
      if (!requestValidation.isValid) {
        this.reportViolation(requestValidation, req);
      }

      // Log validation errors if any
      if (!requestValidation.isValid) {
        this.logValidationErrors(requestValidation, 'request');

        // In strict mode, reject invalid requests
        if (this.isStrictMode()) {
          return this.sendValidationError(res, requestValidation);
        }
      }

      next();
    } catch (error) {
      this.logger.error('OpenAPI validation middleware error:', error);
      next();
    }
  }

  /**
   * Validate incoming request
   */
  private validateRequest(req: Request): ValidationResult {
    const headers = this.normalizeHeaders(req.headers);
    const query = req.query as Record<string, any>;
    const body = req.body;

    return this.openApiValidation.validateRequest(req.method, req.path, headers, query, body);
  }

  /**
   * Validate outgoing response
   */
  private validateResponse(
    method: string,
    path: string,
    statusCode: number,
    headers: any,
    body: any,
  ): void {
    try {
      const normalizedHeaders = this.normalizeHeaders(headers);
      const responseValidation = this.openApiValidation.validateResponse(
        method,
        path,
        statusCode,
        normalizedHeaders,
        body,
      );

      // Report violations if any
      if (!responseValidation.isValid) {
        this.reportViolation(responseValidation, null, statusCode, normalizedHeaders, body);
      }

      if (!responseValidation.isValid) {
        this.logValidationErrors(responseValidation, 'response');

        // In strict mode, log warnings about contract violations
        if (this.isStrictMode()) {
          this.logger.warn(`Response contract violation detected for ${method} ${path}`, {
            statusCode,
            errors: responseValidation.errors.length,
            warnings: responseValidation.warnings.length,
          });
        }
      }
    } catch (error) {
      this.logger.error('Response validation error:', error);
    }
  }

  /**
   * Report contract violations
   */
  private reportViolation(
    validation: ValidationResult,
    req: Request | null,
    statusCode?: number,
    headers?: Record<string, string>,
    body?: any,
  ): void {
    try {
      const metadata = {
        userAgent: req?.get('User-Agent'),
        ipAddress: req?.ip || req?.connection.remoteAddress,
        requestId: req?.headers['x-request-id'] as string,
        userId: (req as any)?.user?.id,
        responseTime: req ? Date.now() - ((req as any).validation?.startTime || Date.now()) : 0,
        statusCode,
        environment: process.env.NODE_ENV || 'unknown',
      };

      this.violationReporter.recordViolation(validation, metadata);
    } catch (error) {
      this.logger.error('Failed to report violation:', error);
    }
  }

  /**
   * Normalize headers to a consistent format
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = Array.isArray(value) ? value[0] : String(value);
    }

    return normalized;
  }

  /**
   * Log validation errors with context
   */
  private logValidationErrors(validation: ValidationResult, type: 'request' | 'response'): void {
    for (const error of validation.errors) {
      this.logger.error(`OpenAPI ${type} validation error`, {
        endpoint: `${validation.metadata.method} ${validation.metadata.endpoint}`,
        code: error.code,
        message: error.message,
        location: error.location,
        severity: error.severity,
      });
    }

    for (const warning of validation.warnings) {
      this.logger.warn(`OpenAPI ${type} validation warning`, {
        endpoint: `${validation.metadata.method} ${validation.metadata.endpoint}`,
        code: warning.code,
        message: warning.message,
        recommendation: warning.recommendation,
      });
    }
  }

  /**
   * Send validation error response
   */
  private sendValidationError(res: Response, validation: ValidationResult): void {
    const errorResponse = {
      error: true,
      message: 'Request validation failed',
      code: 'OPENAPI_VALIDATION_ERROR',
      details: validation.errors.map((error) => ({
        code: error.code,
        message: error.message,
        location: error.location,
      })),
      timestamp: new Date().toISOString(),
      path: validation.metadata.endpoint,
    };

    res.status(400).json(errorResponse);
  }

  /**
   * Check if strict mode is enabled
   */
  private isStrictMode(): boolean {
    // This could be made configurable through environment variables
    return process.env.OPENAPI_STRICT_MODE === 'true';
  }
}
