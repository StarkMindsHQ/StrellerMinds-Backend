import { applyDecorators } from '@nestjs/common';
import { ApiSecurity, ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

export const ApiPublicAuth = () => {
  return applyDecorators(ApiSecurity('bearer'), ApiBearerAuth());
};

export const ApiApiKeyAuth = () => {
  return applyDecorators(ApiSecurity('api_key'));
};

export const ApiOptionalAuth = () => {
  return applyDecorators(ApiBearerAuth({} as any));
};

export const ApiStandardSecurity = (requireAuth: boolean = true) => {
  if (requireAuth) {
    return applyDecorators(ApiBearerAuth(), ApiSecurity('api_key'));
  }
  return applyDecorators();
};

export const ApiRateLimit = (limit: number, ttl: number) => {
  return applyDecorators(
    ApiOperation({
      description: `Rate limit: ${limit} requests per ${ttl / 1000} seconds`,
    }),
  );
};

export const ApiTagged = (tag: string) => {
  return applyDecorators(ApiTags(tag));
};
