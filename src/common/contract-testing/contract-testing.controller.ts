import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OpenAPIValidationService } from './openapi-validation.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';

/**
 * Contract Testing Controller
 *
 * Provides administrative endpoints for monitoring and managing
 * OpenAPI contract validation.
 *
 * Features:
 * - Validation statistics and metrics
 * - Endpoint coverage reporting
 * - Contract violation monitoring
 * - Specification management
 */

@ApiTags('Contract Testing')
@ApiSecurity('bearerAuth')
@Controller('admin/contract-testing')
@UseGuards(JwtAuthGuard)
export class ContractTestingController {
  constructor(private readonly openApiValidation: OpenAPIValidationService) {}

  @Get('specification')
  @ApiOperation({ summary: 'Get OpenAPI specification', description: 'Returns the currently loaded OpenAPI specification document.' })
  @ApiResponse({
    status: 200,
    description: 'OpenAPI specification retrieved successfully',
    content: {
      'application/json': {
        example: {
          specification: { openapi: '3.0.3', info: { title: 'StrellerMinds Backend API', version: '1.0.0' }, paths: {} },
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  getSpecification() {
    return {
      specification: this.openApiValidation.getSpecification(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'Get all API endpoints from specification', description: 'Lists every endpoint defined in the loaded OpenAPI specification.' })
  @ApiResponse({
    status: 200,
    description: 'Endpoints retrieved successfully',
    content: {
      'application/json': {
        example: {
          endpoints: [
            { method: 'POST', path: '/auth/login' },
            { method: 'POST', path: '/auth/register' },
            { method: 'GET', path: '/users' },
          ],
          total: 3,
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  getEndpoints() {
    const endpoints = this.openApiValidation.getEndpoints();

    return {
      endpoints,
      total: endpoints.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get validation statistics', description: 'Returns aggregated request/response validation statistics.' })
  @ApiResponse({
    status: 200,
    description: 'Validation statistics retrieved successfully',
    content: {
      'application/json': {
        example: {
          totalRequests: 1024,
          validRequests: 998,
          invalidRequests: 26,
          totalResponses: 1024,
          validResponses: 1010,
          invalidResponses: 14,
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  getValidationStats() {
    const stats = this.openApiValidation.getValidationStats();

    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('validate/request')
  @ApiOperation({ summary: 'Validate a request against OpenAPI specification', description: 'Checks whether a given request payload conforms to the OpenAPI spec.' })
  @ApiBody({
    description: 'Request data to validate',
    schema: {
      type: 'object',
      required: ['method', 'path', 'headers', 'query'],
      properties: {
        method: { type: 'string', example: 'POST' },
        path: { type: 'string', example: '/auth/login' },
        headers: { type: 'object', example: { 'content-type': 'application/json' } },
        query: { type: 'object', example: {} },
        body: { type: 'object', example: { email: 'alice@example.com', password: 'P@ssw0rd!' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Request validation completed',
    content: {
      'application/json': {
        example: {
          validation: { valid: true, errors: [] },
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  validateRequest(
    @Body()
    requestData: {
      method: string;
      path: string;
      headers: Record<string, string>;
      query: Record<string, any>;
      body?: any;
    },
  ) {
    const validation = this.openApiValidation.validateRequest(
      requestData.method,
      requestData.path,
      requestData.headers,
      requestData.query,
      requestData.body,
    );

    return {
      validation,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('validate/response')
  @ApiOperation({ summary: 'Validate a response against OpenAPI specification', description: 'Checks whether a given response payload conforms to the OpenAPI spec.' })
  @ApiBody({
    description: 'Response data to validate',
    schema: {
      type: 'object',
      required: ['method', 'path', 'statusCode', 'headers'],
      properties: {
        method: { type: 'string', example: 'POST' },
        path: { type: 'string', example: '/auth/login' },
        statusCode: { type: 'number', example: 200 },
        headers: { type: 'object', example: { 'content-type': 'application/json' } },
        body: {
          type: 'object',
          example: {
            user: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', email: 'alice@example.com' },
            message: 'Login successful',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Response validation completed',
    content: {
      'application/json': {
        example: {
          validation: { valid: true, errors: [] },
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  validateResponse(
    @Body()
    responseData: {
      method: string;
      path: string;
      statusCode: number;
      headers: Record<string, string>;
      body?: any;
    },
  ) {
    const validation = this.openApiValidation.validateResponse(
      responseData.method,
      responseData.path,
      responseData.statusCode,
      responseData.headers,
      responseData.body,
    );

    return {
      validation,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reload-specification')
  @ApiOperation({ summary: 'Reload OpenAPI specification', description: 'Forces a reload of the OpenAPI specification from disk.' })
  @ApiResponse({
    status: 200,
    description: 'Specification reloaded successfully',
    content: {
      'application/json': {
        example: {
          message: 'OpenAPI specification reloaded successfully',
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  async reloadSpecification() {
    await this.openApiValidation.reloadSpecification();

    return {
      message: 'OpenAPI specification reloaded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear validation cache', description: 'Clears the in-memory validation result cache.' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    content: {
      'application/json': {
        example: {
          message: 'Validation cache cleared successfully',
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  clearCache() {
    this.openApiValidation.clearCache();

    return {
      message: 'Validation cache cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Get endpoint coverage report', description: 'Returns a report showing which API endpoints have test coverage.' })
  @ApiQuery({ name: 'includeTests', required: false, description: 'Include test details in the report', example: 'true' })
  @ApiResponse({
    status: 200,
    description: 'Coverage report generated successfully',
    content: {
      'application/json': {
        example: {
          totalEndpoints: 25,
          coveredEndpoints: 20,
          coveragePercentage: 80,
          uncoveredEndpoints: [
            { method: 'DELETE', path: '/gdpr/retention-policies/apply' },
            { method: 'POST', path: '/auth/mfa/disable' },
          ],
          timestamp: '2024-06-01T12:00:00.000Z',
        },
      },
    },
  })
  getCoverage(@Query('includeTests') includeTests?: string) {
    const endpoints = this.openApiValidation.getEndpoints();

    // This would integrate with test coverage data in a real implementation
    const coverage = {
      totalEndpoints: endpoints.length,
      coveredEndpoints: Math.floor(endpoints.length * 0.8), // Mock coverage data
      coveragePercentage: 80, // Mock coverage percentage
      uncoveredEndpoints: endpoints.slice(0, Math.floor(endpoints.length * 0.2)),
      timestamp: new Date().toISOString(),
    };

    return coverage;
  }
}
