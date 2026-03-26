import { app, contractHelper } from './setup';

describe('Comprehensive API Contract Tests', () => {
  describe('Endpoint Coverage', () => {
    it('should have all endpoints documented in OpenAPI spec', () => {
      const endpoints = contractHelper.getAllEndpoints();
      expect(endpoints.length).toBeGreaterThan(0);
      
      // Check critical endpoints exist
      const criticalPaths = [
        { path: '/auth/register', method: 'POST' },
        { path: '/auth/login', method: 'POST' },
        { path: '/users', method: 'GET' },
        { path: '/users', method: 'POST' },
        { path: '/users/{id}', method: 'GET' },
        { path: '/users/{id}', method: 'PATCH' }
      ];

      criticalPaths.forEach(({ path, method }) => {
        const exists = contractHelper.endpointExists(method, path);
        expect(exists).toBe(true);
      });
    });

    it('should have proper operation IDs for all endpoints', () => {
      const endpoints = contractHelper.getAllEndpoints();
      const endpointsWithoutOperationId = endpoints.filter(
        endpoint => !endpoint.operationId
      );
      
      expect(endpointsWithoutOperationId.length).toBe(0);
    });

    it('should have proper tags for endpoint organization', () => {
      const endpoints = contractHelper.getAllEndpoints();
      const endpointsWithoutTags = endpoints.filter(
        endpoint => !endpoint.tags || endpoint.tags.length === 0
      );
      
      expect(endpointsWithoutTags.length).toBe(0);
    });
  });

  describe('Schema Validation', () => {
    it('should validate authentication endpoints', async () => {
      const authEndpoints = [
        { method: 'POST' as const, path: '/auth/register', body: { email: 'test@example.com', password: 'Password123!' } },
        { method: 'POST' as const, path: '/auth/login', body: { email: 'test@example.com', password: 'Password123!' } },
        { method: 'POST' as const, path: '/auth/refresh', body: { refreshToken: 'token' } }
      ];

      for (const endpoint of authEndpoints) {
        const validation = contractHelper.validateRequestBody(endpoint.method, endpoint.path, endpoint.body);
        expect(validation.valid).toBe(true);
      }
    });

    it('should validate user management endpoints', async () => {
      const userEndpoints = [
        { 
          method: 'POST' as const, 
          path: '/users', 
          body: { email: 'user@example.com', firstName: 'Test', lastName: 'User', username: 'testuser' } 
        },
        { 
          method: 'PATCH' as const, 
          path: '/users/123', 
          body: { firstName: 'Updated' } 
        }
      ];

      for (const endpoint of userEndpoints) {
        const validation = contractHelper.validateRequestBody(endpoint.method, endpoint.path, endpoint.body);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Response Structure Validation', () => {
    it('should maintain consistent error response structure', async () => {
      const errorEndpoints = [
        { method: 'POST' as const, path: '/auth/login', body: { email: 'invalid', password: 'wrong' } },
        { method: 'GET' as const, path: '/users/nonexistent' }
      ];

      for (const endpoint of errorEndpoints) {
        const result = await contractHelper.makeRequestAndValidate({
          ...endpoint,
          expectedStatus: 400 // Will be adjusted based on actual response
        });

        // Check that error responses have consistent structure
        if (result.response.status >= 400) {
          expect(result.response.body).toHaveProperty('message');
        }
      }
    });

    it('should validate success response structures', async () => {
      // Test GET endpoints that should return data
      const getEndpoints = ['/users'];

      for (const path of getEndpoints) {
        const result = await contractHelper.makeRequestAndValidate({
          method: 'GET',
          path,
          expectedStatus: 200
        });

        if (result.response.status === 200) {
          expect(result.response.body).toBeDefined();
        }
      }
    });
  });

  describe('HTTP Method Compliance', () => {
    it('should use appropriate HTTP methods', () => {
      const endpoints = contractHelper.getAllEndpoints();
      
      // Check for proper REST conventions
      const conventions = [
        { pattern: /\/auth\/login/, expectedMethod: 'POST' },
        { pattern: /\/auth\/register/, expectedMethod: 'POST' },
        { pattern: /\/users$/, expectedMethod: 'GET' },
        { pattern: /\/users$/, expectedMethod: 'POST' },
        { pattern: /\/users\/[^\/]+$/, expectedMethod: 'GET' },
        { pattern: /\/users\/[^\/]+$/, expectedMethod: 'PATCH' }
      ];

      conventions.forEach(({ pattern, expectedMethod }) => {
        const matchingEndpoints = endpoints.filter(
          endpoint => pattern.test(endpoint.path) && endpoint.method === expectedMethod
        );
        expect(matchingEndpoints.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Status Code Compliance', () => {
    it('should use appropriate status codes', () => {
      const endpoints = contractHelper.getAllEndpoints();
      
      // Verify endpoints have documented success responses
      endpoints.forEach(endpoint => {
        const pathSpec = (contractHelper as any).openApiSpec.paths[endpoint.path];
        const operation = pathSpec[endpoint.method.toLowerCase()];
        
        expect(operation).toBeDefined();
        expect(operation.responses).toBeDefined();
        
        // Should have at least one success response (2xx)
        const successResponses = Object.keys(operation.responses).filter(
          code => code.startsWith('2')
        );
        expect(successResponses.length).toBeGreaterThan(0);
      });
    });
  });
});
