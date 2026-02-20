import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const ApiStandardHeaders = () => {
  return applyDecorators(
    ApiHeader({
      name: 'Content-Type',
      description: 'Content type of the request body',
      required: true,
      schema: { type: 'string', example: 'application/json' },
    }),
    ApiHeader({
      name: 'Accept',
      description: 'Expected response format',
      required: false,
      schema: { type: 'string', example: 'application/json' },
    }),
    ApiHeader({
      name: 'X-Request-ID',
      description: 'Unique request identifier for tracking',
      required: false,
      schema: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
    }),
    ApiHeader({
      name: 'User-Agent',
      description: 'Client user agent',
      required: false,
      schema: { type: 'string', example: 'StrellerMinds-Client/1.0.0' },
    }),
  );
};

export const ApiAuthHeaders = () => {
  return applyDecorators(
    ApiStandardHeaders(),
    ApiHeader({
      name: 'Authorization',
      description: 'Bearer token for authentication',
      required: true,
      schema: { type: 'string', example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    }),
  );
};

export const ApiApiKeyHeaders = () => {
  return applyDecorators(
    ApiStandardHeaders(),
    ApiHeader({
      name: 'X-API-Key',
      description: 'API key for service-to-service authentication',
      required: true,
      schema: { type: 'string', example: 'sk_live_1234567890abcdef' },
    }),
  );
};
