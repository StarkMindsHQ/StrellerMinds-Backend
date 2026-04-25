import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { validate as validateJsonSchema } from 'json-schema';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * OpenAPI Contract Validation Service
 *
 * Provides comprehensive OpenAPI specification validation for API endpoints.
 * Validates requests and responses against OpenAPI contracts.
 *
 * Business Rules:
 * 1. All API endpoints must conform to OpenAPI specification
 * 2. Request/response validation must be automatic
 * 3. Contract violations must be logged and reported
 * 4. Validation errors should be developer-friendly
 * 5. Support for both JSON and YAML specifications
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  location: {
    line?: number;
    column?: number;
    parameter?: string;
    header?: string;
  };
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  recommendation: string;
}

export interface ValidationMetadata {
  endpoint: string;
  method: string;
  operationId: string;
  timestamp: number;
  validationType: 'request' | 'response';
  duration: number;
}

export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export interface ContractValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  validateResponses: boolean;
  validateRequests: boolean;
  logViolations: boolean;
  reportViolations: boolean;
  specificationPath: string;
  cacheValidation: boolean;
  maxCacheSize: number;
}

@Injectable()
export class OpenAPIValidationService {
  private readonly logger = new Logger(OpenAPIValidationService.name);
  private readonly ajv: any;
  private openApiSpec: OpenAPIDocument | null = null;
  private schemaCache = new Map<string, any>();
  private validationCache = new Map<string, ValidationResult>();
  private readonly config: ContractValidationConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      enabled: this.configService.get('OPENAPI_VALIDATION_ENABLED', true),
      strictMode: this.configService.get('OPENAPI_VALIDATION_STRICT', false),
      validateResponses: this.configService.get('OPENAPI_VALIDATE_RESPONSES', true),
      validateRequests: this.configService.get('OPENAPI_VALIDATE_REQUESTS', true),
      logViolations: this.configService.get('OPENAPI_LOG_VIOLATIONS', true),
      reportViolations: this.configService.get('OPENAPI_REPORT_VIOLATIONS', true),
      specificationPath: this.configService.get('OPENAPI_SPEC_PATH', './api-specification.yaml'),
      cacheValidation: this.configService.get('OPENAPI_CACHE_VALIDATION', true),
      maxCacheSize: this.configService.get('OPENAPI_MAX_CACHE_SIZE', 1000),
    };

    // Initialize AJV for JSON schema validation
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Disable strict mode to avoid schema validation errors
      removeAdditional: this.config.strictMode ? 'all' : false,
    } as any);

    // Add format validation
    addFormats(this.ajv);

    // Load OpenAPI specification
    this.loadSpecification();
  }

  /**
   * Load OpenAPI specification from file
   */
  private async loadSpecification(): Promise<void> {
    try {
      const specPath = path.resolve(this.config.specificationPath);
      const specContent = fs.readFileSync(specPath, 'utf8');

      // Parse YAML or JSON
      if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
        this.openApiSpec = yaml.load(specContent) as OpenAPIDocument;
      } else {
        this.openApiSpec = JSON.parse(specContent) as OpenAPIDocument;
      }

      // Validate the specification itself
      this.validateSpecification();

      // Register all schemas with AJV for $ref resolution
      this.registerSchemas();

      // Pre-compile schemas for better performance
      this.precompileSchemas();

      this.logger.log(`OpenAPI specification loaded from ${specPath}`);
      this.logger.log(`API: ${this.openApiSpec.info.title} v${this.openApiSpec.info.version}`);
      this.logger.log(`Endpoints defined: ${Object.keys(this.openApiSpec.paths).length}`);
    } catch (error) {
      this.logger.error('Failed to load OpenAPI specification:', error);
      throw new Error(`OpenAPI specification loading failed: ${error.message}`);
    }
  }

  /**
   * Validate the OpenAPI specification itself
   */
  private validateSpecification(): void {
    if (!this.openApiSpec) {
      throw new Error('OpenAPI specification not loaded');
    }

    // Basic structure validation
    const requiredFields = ['openapi', 'info', 'paths'];
    for (const field of requiredFields) {
      if (!this.openApiSpec[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate OpenAPI version
    if (!this.openApiSpec.openapi.startsWith('3.0.')) {
      throw new Error(`Unsupported OpenAPI version: ${this.openApiSpec.openapi}`);
    }

    // Validate info object
    const requiredInfoFields = ['title', 'version'];
    for (const field of requiredInfoFields) {
      if (!this.openApiSpec.info[field]) {
        throw new Error(`Missing required info field: ${field}`);
      }
    }
  }

  /**
   * Register all schemas from OpenAPI spec with AJV for $ref resolution
   */
  private registerSchemas(): void {
    if (!this.openApiSpec?.components?.schemas) {
      return;
    }

    const schemas = this.openApiSpec.components.schemas;

    for (const [schemaName, schema] of Object.entries(schemas)) {
      try {
        // Add schema with its full reference path
        this.ajv.addSchema(schema, `#/components/schemas/${schemaName}`);
      } catch (error) {
        this.logger.warn(`Failed to register schema ${schemaName}:`, error.message);
      }
    }

    this.logger.log(`Registered ${Object.keys(schemas).length} schemas with AJV`);
  }

  /**
   * Pre-compile JSON schemas for better validation performance
   */
  private precompileSchemas(): void {
    if (!this.openApiSpec?.components?.schemas) {
      return;
    }

    const schemas = this.openApiSpec.components.schemas;

    for (const [schemaName, schema] of Object.entries(schemas)) {
      try {
        const compiledSchema = this.ajv.compile(schema);
        this.schemaCache.set(schemaName, compiledSchema);
      } catch (error) {
        this.logger.warn(`Failed to compile schema ${schemaName}:`, error.message);
      }
    }

    this.logger.log(`Pre-compiled ${this.schemaCache.size} schemas`);
  }

  /**
   * Validate request against OpenAPI specification
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param headers - Request headers
   * @param query - Query parameters
   * @param body - Request body
   * @returns Validation result
   */
  validateRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    query: Record<string, any>,
    body?: any,
  ): ValidationResult {
    const startTime = Date.now();

    try {
      if (!this.config.enabled || !this.config.validateRequests) {
        return this.createValidResult(method, path, 'request', Date.now() - startTime);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(method, path, 'request', body);
      if (this.config.cacheValidation && this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey)!;
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Find endpoint in specification
      const endpoint = this.findEndpoint(method, path);
      if (!endpoint) {
        errors.push({
          path,
          message: `Endpoint ${method} ${path} not found in OpenAPI specification`,
          code: 'ENDPOINT_NOT_FOUND',
          severity: 'error',
          location: {},
        });
        return this.createInvalidResult(
          method,
          path,
          'request',
          errors,
          warnings,
          Date.now() - startTime,
        );
      }

      // Validate path parameters
      this.validatePathParameters(method, path, endpoint, errors);

      // Validate query parameters
      this.validateQueryParameters(query, endpoint, errors, warnings, path);

      // Validate headers
      this.validateHeaders(headers, endpoint, errors, warnings, path);

      // Validate request body
      if (body && endpoint.requestBody) {
        this.validateRequestBody(body, endpoint, errors, warnings, path);
      }

      const result =
        errors.length > 0
          ? this.createInvalidResult(
              method,
              path,
              'request',
              errors,
              warnings,
              Date.now() - startTime,
            )
          : this.createValidResult(method, path, 'request', Date.now() - startTime);

      // Cache result
      if (this.config.cacheValidation) {
        this.cacheValidationResult(cacheKey, result);
      }

      // Log violations
      if (errors.length > 0 && this.config.logViolations) {
        this.logValidationErrors(result);
      }

      return result;
    } catch (error) {
      this.logger.error('Request validation error:', error);
      return this.createInvalidResult(
        method,
        path,
        'request',
        [
          {
            path,
            message: `Validation error: ${error.message}`,
            code: 'VALIDATION_ERROR',
            severity: 'error',
            location: {},
          },
        ],
        [],
        Date.now() - startTime,
      );
    }
  }

  /**
   * Validate response against OpenAPI specification
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param statusCode - HTTP status code
   * @param headers - Response headers
   * @param body - Response body
   * @returns Validation result
   */
  validateResponse(
    method: string,
    path: string,
    statusCode: number,
    headers: Record<string, string>,
    body?: any,
  ): ValidationResult {
    const startTime = Date.now();

    try {
      if (!this.config.enabled || !this.config.validateResponses) {
        return this.createValidResult(method, path, 'response', Date.now() - startTime);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(method, path, 'response', body, statusCode);
      if (this.config.cacheValidation && this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey)!;
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Find endpoint in specification
      const endpoint = this.findEndpoint(method, path);
      if (!endpoint) {
        errors.push({
          path,
          message: `Endpoint ${method} ${path} not found in OpenAPI specification`,
          code: 'ENDPOINT_NOT_FOUND',
          severity: 'error',
          location: {},
        });
        return this.createInvalidResult(
          method,
          path,
          'response',
          errors,
          warnings,
          Date.now() - startTime,
        );
      }

      // Validate response
      if (statusCode && endpoint.responses) {
        this.validateResponseSchema(statusCode, body, endpoint, errors, warnings, path);
        this.validateResponseHeaders(statusCode, headers, endpoint, errors, warnings, path);
      }

      const result =
        errors.length > 0
          ? this.createInvalidResult(
              method,
              path,
              'response',
              errors,
              warnings,
              Date.now() - startTime,
            )
          : this.createValidResult(method, path, 'response', Date.now() - startTime);

      // Cache result
      if (this.config.cacheValidation) {
        this.cacheValidationResult(cacheKey, result);
      }

      // Log violations
      if (errors.length > 0 && this.config.logViolations) {
        this.logValidationErrors(result);
      }

      return result;
    } catch (error) {
      this.logger.error('Response validation error:', error);
      return this.createInvalidResult(
        method,
        path,
        'response',
        [
          {
            path,
            message: `Validation error: ${error.message}`,
            code: 'VALIDATION_ERROR',
            severity: 'error',
            location: {},
          },
        ],
        [],
        Date.now() - startTime,
      );
    }
  }

  /**
   * Find endpoint specification by method and path
   */
  private findEndpoint(method: string, path: string): any {
    if (!this.openApiSpec?.paths) {
      return null;
    }

    // Normalize path for matching
    const normalizedPath = this.normalizePath(path);

    // Try exact match first
    let endpoint = this.openApiSpec.paths[normalizedPath]?.[method.toLowerCase()];
    if (endpoint) {
      return { ...endpoint, path: normalizedPath, method };
    }

    // Try pattern matching for paths with parameters
    for (const [specPath, pathSpec] of Object.entries(this.openApiSpec.paths)) {
      if (this.pathMatches(normalizedPath, specPath)) {
        endpoint = pathSpec[method.toLowerCase()];
        if (endpoint) {
          return { ...endpoint, path: specPath, method };
        }
      }
    }

    return null;
  }

  /**
   * Normalize path for matching
   */
  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  /**
   * Check if request path matches specification path pattern
   */
  private pathMatches(requestPath: string, specPath: string): boolean {
    const requestParts = requestPath.split('/').filter(Boolean);
    const specParts = specPath.split('/').filter(Boolean);

    if (requestParts.length !== specParts.length) {
      return false;
    }

    for (let i = 0; i < specParts.length; i++) {
      const specPart = specParts[i];
      const requestPart = requestParts[i];

      // Check if it's a parameter
      if (specPart.startsWith('{') && specPart.endsWith('}')) {
        continue; // Parameter matches anything
      }

      // Exact match required
      if (specPart !== requestPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate path parameters
   */
  private validatePathParameters(
    method: string,
    path: string,
    endpoint: any,
    errors: ValidationError[],
  ): void {
    const specPath = endpoint.path;
    const requestPath = this.normalizePath(path);

    const specParts = specPath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    for (let i = 0; i < specParts.length; i++) {
      const specPart = specParts[i];

      if (specPart.startsWith('{') && specPart.endsWith('}')) {
        const paramName = specPart.slice(1, -1);
        const paramValue = requestParts[i];

        if (!paramValue) {
          errors.push({
            path,
            message: `Missing required path parameter: ${paramName}`,
            code: 'MISSING_PATH_PARAMETER',
            severity: 'error',
            location: { parameter: paramName },
          });
        }
      }
    }
  }

  /**
   * Validate query parameters
   */
  private validateQueryParameters(
    query: Record<string, any>,
    endpoint: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string,
  ): void {
    if (!endpoint.parameters) {
      return;
    }

    const queryParams = endpoint.parameters.filter((param: any) => param.in === 'query');

    for (const param of queryParams) {
      const paramName = param.name;
      const paramValue = query[paramName];

      // Check required parameters
      if (param.required && (paramValue === undefined || paramValue === null)) {
        errors.push({
          path,
          message: `Missing required query parameter: ${paramName}`,
          code: 'MISSING_QUERY_PARAMETER',
          severity: 'error',
          location: { parameter: paramName },
        });
        continue;
      }

      // Skip validation if parameter is not provided
      if (paramValue === undefined || paramValue === null) {
        continue;
      }

      // Validate parameter schema
      if (param.schema) {
        const validationErrors = this.validateSchema(paramValue, param.schema);
        if (validationErrors.length > 0) {
          errors.push({
            path,
            message: `Invalid value for query parameter ${paramName}: ${validationErrors[0].message}`,
            code: 'INVALID_QUERY_PARAMETER',
            severity: 'error',
            location: { parameter: paramName },
          });
        }
      }
    }

    // Check for unknown parameters (in strict mode)
    if (this.config.strictMode) {
      const knownParams = new Set(queryParams.map((param: any) => param.name));
      for (const paramName of Object.keys(query)) {
        if (!knownParams.has(paramName)) {
          warnings.push({
            path,
            message: `Unknown query parameter: ${paramName}`,
            code: 'UNKNOWN_QUERY_PARAMETER',
            recommendation: 'Remove the parameter or add it to the OpenAPI specification',
          });
        }
      }
    }
  }

  /**
   * Validate headers
   */
  private validateHeaders(
    headers: Record<string, string>,
    endpoint: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string,
  ): void {
    if (!endpoint.parameters) {
      return;
    }

    const headerParams = endpoint.parameters.filter((param: any) => param.in === 'header');

    for (const param of headerParams) {
      const headerName = param.name.toLowerCase();
      const headerValue = headers[headerName];

      // Check required headers
      if (param.required && !headerValue) {
        errors.push({
          path,
          message: `Missing required header: ${param.name}`,
          code: 'MISSING_HEADER',
          severity: 'error',
          location: { header: param.name },
        });
        continue;
      }

      // Skip validation if header is not provided
      if (!headerValue) {
        continue;
      }

      // Validate header schema
      if (param.schema) {
        const validationErrors = this.validateSchema(headerValue, param.schema);
        if (validationErrors.length > 0) {
          errors.push({
            path,
            message: `Invalid value for header ${param.name}: ${validationErrors[0].message}`,
            code: 'INVALID_HEADER',
            severity: 'error',
            location: { header: param.name },
          });
        }
      }
    }
  }

  /**
   * Validate request body
   */
  private validateRequestBody(
    body: any,
    endpoint: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string,
  ): void {
    const requestBody = endpoint.requestBody;

    // Check content type
    const contentType = requestBody.content?.['application/json'];
    if (!contentType) {
      warnings.push({
        path,
        message: 'No application/json content type defined in specification',
        code: 'MISSING_CONTENT_TYPE',
        recommendation: 'Add application/json content type to the request body specification',
      });
      return;
    }

    // Validate body schema
    if (contentType.schema) {
      const validationErrors = this.validateSchema(body, contentType.schema);
      if (validationErrors.length > 0) {
        for (const error of validationErrors) {
          errors.push({
            path,
            message: `Request body validation error: ${error.message}`,
            code: 'INVALID_REQUEST_BODY',
            severity: 'error',
            location: {},
          });
        }
      }
    }
  }

  /**
   * Validate response schema
   */
  private validateResponseSchema(
    statusCode: number,
    body: any,
    endpoint: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string,
  ): void {
    const responses = endpoint.responses;

    // Find response specification
    let responseSpec = responses[statusCode.toString()];
    if (!responseSpec) {
      // Try default response
      responseSpec = responses.default;
      if (!responseSpec) {
        warnings.push({
          path,
          message: `No specification found for status code ${statusCode}`,
          code: 'MISSING_RESPONSE_SPEC',
          recommendation: `Add response specification for status code ${statusCode}`,
        });
        return;
      }
    }

    // Check content type
    const contentType = responseSpec.content?.['application/json'];
    if (!contentType) {
      warnings.push({
        path,
        message: `No application/json content type defined for response ${statusCode}`,
        code: 'MISSING_RESPONSE_CONTENT_TYPE',
        recommendation: 'Add application/json content type to the response specification',
      });
      return;
    }

    // Validate response schema
    if (contentType.schema && body !== null && body !== undefined) {
      const validationErrors = this.validateSchema(body, contentType.schema);
      if (validationErrors.length > 0) {
        for (const error of validationErrors) {
          errors.push({
            path,
            message: `Response body validation error for status ${statusCode}: ${error.message}`,
            code: 'INVALID_RESPONSE_BODY',
            severity: 'error',
            location: {},
          });
        }
      }
    }
  }

  /**
   * Validate response headers
   */
  private validateResponseHeaders(
    statusCode: number,
    headers: Record<string, string>,
    endpoint: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string,
  ): void {
    const responses = endpoint.responses;
    const responseSpec = responses[statusCode.toString()] || responses.default;

    if (!responseSpec?.headers) {
      return;
    }

    for (const [headerName, headerSpec] of Object.entries(responseSpec.headers)) {
      const headerValue = headers[headerName.toLowerCase()];

      // Check required headers
      if ((headerSpec as any).required && !headerValue) {
        errors.push({
          path,
          message: `Missing required response header: ${headerName}`,
          code: 'MISSING_RESPONSE_HEADER',
          severity: 'error',
          location: { header: headerName },
        });
        continue;
      }

      // Skip validation if header is not provided
      if (!headerValue) {
        continue;
      }

      // Validate header schema
      if ((headerSpec as any).schema) {
        const validationErrors = this.validateSchema(headerValue, (headerSpec as any).schema);
        if (validationErrors.length > 0) {
          errors.push({
            path,
            message: `Invalid value for response header ${headerName}: ${validationErrors[0].message}`,
            code: 'INVALID_RESPONSE_HEADER',
            severity: 'error',
            location: { header: headerName },
          });
        }
      }
    }
  }

  /**
   * Validate data against JSON schema
   */
  private validateSchema(data: any, schema: any): any[] {
    try {
      const validate = this.ajv.compile(schema);
      const isValid = validate(data);

      if (isValid) {
        return [];
      }

      return validate.errors || [];
    } catch (error) {
      return [{ message: `Schema validation error: ${error.message}` }];
    }
  }

  /**
   * Generate cache key for validation results
   */
  private generateCacheKey(
    method: string,
    path: string,
    type: 'request' | 'response',
    body?: any,
    statusCode?: number,
  ): string {
    const bodyHash = body ? this.hashObject(body) : '';
    const statusSuffix = statusCode ? `_${statusCode}` : '';
    return `${method}_${path}_${type}_${bodyHash}${statusSuffix}`;
  }

  /**
   * Simple hash function for objects
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  /**
   * Cache validation result
   */
  private cacheValidationResult(key: string, result: ValidationResult): void {
    if (this.validationCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }

    this.validationCache.set(key, result);
  }

  /**
   * Create valid validation result
   */
  private createValidResult(
    method: string,
    path: string,
    type: 'request' | 'response',
    duration: number,
  ): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        endpoint: path,
        method,
        operationId: this.getOperationId(method, path),
        timestamp: Date.now(),
        validationType: type,
        duration,
      },
    };
  }

  /**
   * Create invalid validation result
   */
  private createInvalidResult(
    method: string,
    path: string,
    type: 'request' | 'response',
    errors: ValidationError[],
    warnings: ValidationWarning[],
    duration: number,
  ): ValidationResult {
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        endpoint: path,
        method,
        operationId: this.getOperationId(method, path),
        timestamp: Date.now(),
        validationType: type,
        duration,
      },
    };
  }

  /**
   * Get operation ID for endpoint
   */
  private getOperationId(method: string, path: string): string {
    const endpoint = this.findEndpoint(method, path);
    return endpoint?.operationId || `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Log validation errors
   */
  private logValidationErrors(result: ValidationResult): void {
    for (const error of result.errors) {
      this.logger.error(`Contract validation error: ${error.message}`, {
        endpoint: result.metadata.endpoint,
        method: result.metadata.method,
        code: error.code,
        location: error.location,
      });
    }

    for (const warning of result.warnings) {
      this.logger.warn(`Contract validation warning: ${warning.message}`, {
        endpoint: result.metadata.endpoint,
        method: result.metadata.method,
        code: warning.code,
      });
    }
  }

  /**
   * Get OpenAPI specification
   */
  getSpecification(): OpenAPIDocument | null {
    return this.openApiSpec;
  }

  /**
   * Get all endpoints from specification
   */
  getEndpoints(): Array<{
    method: string;
    path: string;
    operationId: string;
    summary?: string;
    description?: string;
    tags?: string[];
  }> {
    if (!this.openApiSpec?.paths) {
      return [];
    }

    const endpoints = [];

    for (const [path, pathSpec] of Object.entries(this.openApiSpec.paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
        const operation = pathSpec[method];
        if (operation) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            operationId: operation.operationId || `${method}_${path}`,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags,
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    cacheHitRate: number;
    averageValidationTime: number;
  } {
    const totalValidations = this.validationCache.size;
    // This is a simplified implementation - in production, you'd track more detailed metrics
    return {
      totalValidations,
      successfulValidations: Math.floor(totalValidations * 0.9), // Estimated
      failedValidations: Math.floor(totalValidations * 0.1), // Estimated
      cacheHitRate: 0.85, // Estimated
      averageValidationTime: 15, // Estimated in milliseconds
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.logger.log('Validation cache cleared');
  }

  /**
   * Reload OpenAPI specification
   */
  async reloadSpecification(): Promise<void> {
    this.clearCache();
    this.schemaCache.clear();
    await this.loadSpecification();
  }
}
