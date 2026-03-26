import { SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ContractTestConfig {
  app: INestApplication;
  openApiSpec: any;
  baseUrl: string;
}

export class ContractTestHelper {
  private ajv: Ajv;
  private openApiSpec: any;
  private app: INestApplication;

  constructor(config: ContractTestConfig) {
    this.app = config.app;
    this.openApiSpec = config.openApiSpec;
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  /**
   * Validate response against OpenAPI schema
   */
  async validateResponse(
    method: string,
    path: string,
    statusCode: number,
    response: any
  ): Promise<{ valid: boolean; errors: any[] }> {
    try {
      const schema = this.getResponseSchema(method, path, statusCode);
      if (!schema) {
        return { valid: true, errors: [] }; // No schema defined
      }

      const validate = this.ajv.compile(schema);
      const valid = validate(response);
      
      return {
        valid: !!valid,
        errors: validate.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message, type: 'validation_error' }]
      };
    }
  }

  /**
   * Get response schema from OpenAPI spec
   */
  private getResponseSchema(method: string, path: string, statusCode: number): any {
    const normalizedPath = this.normalizePath(path);
    const pathSpec = this.openApiSpec.paths[normalizedPath];
    
    if (!pathSpec || !pathSpec[method.toLowerCase()]) {
      return null;
    }

    const operation = pathSpec[method.toLowerCase()];
    const response = operation.responses[statusCode.toString()];
    
    if (!response || !response.content) {
      return null;
    }

    const content = response.content['application/json'] || response.content['*/*'];
    return content?.schema || null;
  }

  /**
   * Normalize path parameters to OpenAPI format
   */
  private normalizePath(path: string): string {
    return path.replace(/\/([^\/]+)/g, '/{$1}');
  }

  /**
   * Make HTTP request and validate response
   */
  async makeRequestAndValidate(options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    expectedStatus?: number;
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, any>;
  }): Promise<{
    response: request.Response;
    validation: { valid: boolean; errors: any[] };
    contractValid: boolean;
  }> {
    const { method, path, expectedStatus = 200, body, headers, query } = options;
    
    let req = request(this.app.getHttpServer())[method.toLowerCase()](path);
    
    if (headers) {
      req = req.set(headers);
    }
    
    if (body) {
      req = req.send(body);
    }
    
    if (query) {
      req = req.query(query);
    }

    const response = await req;
    const validation = await this.validateResponse(method, path, response.status, response.body);
    
    return {
      response,
      validation,
      contractValid: validation.valid && response.status === expectedStatus
    };
  }

  /**
   * Get all endpoints from OpenAPI spec
   */
  getAllEndpoints(): Array<{
    path: string;
    method: string;
    operationId?: string;
    tags: string[];
    summary?: string;
  }> {
    const endpoints = [];
    
    for (const [path, pathSpec] of Object.entries(this.openApiSpec.paths || {})) {
      for (const [method, operation] of Object.entries(pathSpec as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: (operation as any).operationId,
            tags: (operation as any).tags || [],
            summary: (operation as any).summary
          });
        }
      }
    }
    
    return endpoints;
  }

  /**
   * Validate request body against OpenAPI schema
   */
  validateRequestBody(method: string, path: string, body: any): { valid: boolean; errors: any[] } {
    try {
      const schema = this.getRequestBodySchema(method, path);
      if (!schema) {
        return { valid: true, errors: [] }; // No schema defined
      }

      const validate = this.ajv.compile(schema);
      const valid = validate(body);
      
      return {
        valid: !!valid,
        errors: validate.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message, type: 'validation_error' }]
      };
    }
  }

  /**
   * Get request body schema from OpenAPI spec
   */
  private getRequestBodySchema(method: string, path: string): any {
    const normalizedPath = this.normalizePath(path);
    const pathSpec = this.openApiSpec.paths[normalizedPath];
    
    if (!pathSpec || !pathSpec[method.toLowerCase()]) {
      return null;
    }

    const operation = pathSpec[method.toLowerCase()];
    const requestBody = operation.requestBody;
    
    if (!requestBody || !requestBody.content) {
      return null;
    }

    const content = requestBody.content['application/json'] || requestBody.content['*/*'];
    return content?.schema || null;
  }

  /**
   * Check if endpoint exists in OpenAPI spec
   */
  endpointExists(method: string, path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const pathSpec = this.openApiSpec.paths[normalizedPath];
    return !!(pathSpec && pathSpec[method.toLowerCase()]);
  }
}
