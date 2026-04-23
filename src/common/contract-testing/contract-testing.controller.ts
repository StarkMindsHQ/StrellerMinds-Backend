import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'OpenAPI specification retrieved successfully' })
  getSpecification() {
    return {
      specification: this.openApiValidation.getSpecification(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'Get all API endpoints from specification' })
  @ApiResponse({ status: 200, description: 'Endpoints retrieved successfully' })
  getEndpoints() {
    const endpoints = this.openApiValidation.getEndpoints();

    return {
      endpoints,
      total: endpoints.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get validation statistics' })
  @ApiResponse({ status: 200, description: 'Validation statistics retrieved successfully' })
  getValidationStats() {
    const stats = this.openApiValidation.getValidationStats();

    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('validate/request')
  @ApiOperation({ summary: 'Validate a request against OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'Request validation completed' })
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
  @ApiOperation({ summary: 'Validate a response against OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'Response validation completed' })
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
  @ApiOperation({ summary: 'Reload OpenAPI specification' })
  @ApiResponse({ status: 200, description: 'Specification reloaded successfully' })
  async reloadSpecification() {
    await this.openApiValidation.reloadSpecification();

    return {
      message: 'OpenAPI specification reloaded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear validation cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  clearCache() {
    this.openApiValidation.clearCache();

    return {
      message: 'Validation cache cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Get endpoint coverage report' })
  @ApiResponse({ status: 200, description: 'Coverage report generated successfully' })
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
