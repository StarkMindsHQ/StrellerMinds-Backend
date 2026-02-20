import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ApiResponse as IApiResponse } from '@nestjs/swagger';

export interface ApiErrorResponseOptions {
  status: number;
  description: string;
  errorType?: string;
}

export const ApiStandardResponse = (
  summary: string,
  successStatus: number = 200,
  successDescription: string = 'Operation successful',
  errorResponses: ApiErrorResponseOptions[] = [],
) => {
  const decorators = [
    ApiOperation({ summary }),
    ApiResponse({
      status: successStatus,
      description: successDescription,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: successDescription },
          data: { type: 'object' },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
  ];

  // Add standard error responses
  const standardErrors = [
    { status: 400, description: 'Bad Request - Invalid input data' },
    { status: 401, description: 'Unauthorized - Authentication required' },
    { status: 403, description: 'Forbidden - Insufficient permissions' },
    { status: 404, description: 'Not Found - Resource does not exist' },
    { status: 429, description: 'Too Many Requests - Rate limit exceeded' },
    { status: 500, description: 'Internal Server Error' },
    ...errorResponses,
  ];

  standardErrors.forEach((error) => {
    decorators.push(
      ApiResponse({
        status: error.status,
        description: error.description,
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: error.description },
            error: { type: 'string', example: error.errorType || 'ERROR' },
            timestamp: { type: 'string', example: new Date().toISOString() },
          },
        },
      }),
    );
  });

  return applyDecorators(...decorators);
};

export const ApiPaginatedResponse = (
  summary: string,
  itemType: string,
  successStatus: number = 200,
) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({
      status: successStatus,
      description: 'Paginated response',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Data retrieved successfully' },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: `#/components/schemas/${itemType}` },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 10 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 10 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false },
                },
              },
            },
          },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  );
};
