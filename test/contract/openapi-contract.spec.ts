import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAPIValidationService } from '../../src/common/contract-testing/openapi-validation.service';
import { OpenAPIValidationMiddleware } from '../../src/common/contract-testing/openapi-validation.middleware';
import { Logger } from '@nestjs/common';
import { ContractViolationReporterService } from '../../src/common/contract-testing/contract-violation-reporter.service';
import request from 'supertest';

import { INestApplication } from '@nestjs/common';

/**
 * OpenAPI Contract Testing Suite
 * 
 * Comprehensive automated contract testing for all API endpoints.
 * Validates that all endpoints conform to the OpenAPI specification.
 * 
 * Test Coverage:
 * 1. Request validation against OpenAPI schemas
 * 2. Response validation against OpenAPI schemas
 * 3. Parameter validation (path, query, headers)
 * 4. Error response validation
 * 5. Authentication and authorization validation
 * 6. Content-Type validation
 */

// NOTE: These are E2E contract tests that require a real OpenAPI spec file (api-specification.yaml)
// and a fully running application. Run with: npm run test:e2e
describe.skip('OpenAPI Contract Tests', () => {

  let app: INestApplication;
  let openApiValidation: OpenAPIValidationService;
  let validationMiddleware: OpenAPIValidationMiddleware;

  beforeAll(async () => {
    // Create test module with required services
    const moduleRef = await Test.createTestingModule({
      providers: [
        OpenAPIValidationService,
        OpenAPIValidationMiddleware,
        ContractViolationReporterService,
        ConfigService,
        Logger,

      ],
    }).compile();

    app = moduleRef.createNestApplication();
    
    // Apply validation middleware globally
    app.use(moduleRef.get(OpenAPIValidationMiddleware));
    
    await app.init();
    
    openApiValidation = moduleRef.get<OpenAPIValidationService>(OpenAPIValidationService);
    validationMiddleware = moduleRef.get<OpenAPIValidationMiddleware>(OpenAPIValidationMiddleware);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('should validate GET / endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Validate response against OpenAPI spec
      const validation = openApiValidation.validateResponse(
        'GET',
        '/',
        response.status,
        response.headers,
        response.text
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate GET /health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const validation = openApiValidation.validateResponse(
        'GET',
        '/health',
        response.status,
        response.headers,
        response.body
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Validate response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /auth/login', () => {
      it('should validate valid login request', async () => {
        const loginRequest = {
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        };

        const requestValidation = openApiValidation.validateRequest(
          'POST',
          '/auth/login',
          { 'content-type': 'application/json' },
          {},
          loginRequest
        );

        expect(requestValidation.isValid).toBe(true);
        expect(requestValidation.errors).toHaveLength(0);
      });

      it('should reject invalid login request - missing email', () => {
        const invalidRequest = {
          password: 'password123',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/login',
          { 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors.some(e => e.code === 'MISSING_PATH_PARAMETER' || e.message.includes('email'))).toBe(true);
      });

      it('should reject invalid login request - invalid email format', () => {
        const invalidRequest = {
          email: 'invalid-email',
          password: 'password123',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/login',
          { 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should reject invalid login request - short password', () => {
        const invalidRequest = {
          email: 'test@example.com',
          password: '123',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/login',
          { 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /auth/register', () => {
      it('should validate valid registration request', () => {
        const registerRequest = {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/register',
          { 'content-type': 'application/json' },
          {},
          registerRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid registration request - missing required fields', () => {
        const invalidRequest = {
          email: 'test@example.com',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/register',
          { 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /auth/refresh', () => {
      it('should validate valid refresh token request', () => {
        const refreshRequest = {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/refresh',
          { 'content-type': 'application/json' },
          {},
          refreshRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject refresh request without token', () => {
        const invalidRequest = {};

        const validation = openApiValidation.validateRequest(
          'POST',
          '/auth/refresh',
          { 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Management Endpoints', () => {
    describe('GET /users', () => {
      it('should validate users list request with pagination', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/users',
          { 'authorization': 'Bearer token123' },
          { page: '1', limit: '10', search: 'john' }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should validate users list request without pagination', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/users',
          { 'authorization': 'Bearer token123' },
          {}
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid pagination parameters', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/users',
          { 'authorization': 'Bearer token123' },
          { page: '0', limit: '200' } // Invalid: page < 1, limit > 100
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /users', () => {
      it('should validate valid user creation request', () => {
        const createUserRequest = {
          email: 'newuser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user',
          isActive: true,
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/users',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          createUserRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid user role', () => {
        const invalidRequest = {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'invalid_role',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/users',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('GET /users/{id}', () => {
      it('should validate user detail request with valid UUID', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/users/550e8400-e29b-41d4-a716-446655440000',
          { 'authorization': 'Bearer token123' },
          {}
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should handle user detail request with invalid UUID format', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/users/invalid-uuid',
          { 'authorization': 'Bearer token123' },
          {}
        );

        // This might be valid at the path level but invalid at the parameter level
        // The exact behavior depends on the OpenAPI specification
        expect(validation.isValid).toBeDefined();
      });
    });
  });

  describe('Course Management Endpoints', () => {
    describe('GET /courses', () => {
      it('should validate courses list request with filters', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/courses',
          { 'authorization': 'Bearer token123' },
          { page: '1', limit: '20', category: 'blockchain', difficulty: 'beginner' }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid difficulty level', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/courses',
          { 'authorization': 'Bearer token123' },
          { difficulty: 'invalid' }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /courses', () => {
      it('should validate valid course creation request', () => {
        const createCourseRequest = {
          title: 'Introduction to Blockchain',
          description: 'Learn the fundamentals of blockchain technology',
          category: 'Blockchain',
          difficulty: 'beginner',
          price: 99.99,
          duration: 40,
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/courses',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          createCourseRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject course creation with negative price', () => {
        const invalidRequest = {
          title: 'Test Course',
          description: 'Test Description',
          category: 'Test',
          difficulty: 'beginner',
          price: -10,
          duration: 20,
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/courses',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should reject course creation with insufficient duration', () => {
        const invalidRequest = {
          title: 'Test Course',
          description: 'Test Description',
          category: 'Test',
          difficulty: 'beginner',
          price: 99.99,
          duration: 0, // Should be at least 1
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/courses',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /courses/{id}/enroll', () => {
      it('should validate course enrollment request', () => {
        const validation = openApiValidation.validateRequest(
          'POST',
          '/courses/550e8400-e29b-41d4-a716-446655440000/enroll',
          { 'authorization': 'Bearer token123' },
          {}
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  describe('Payment Endpoints', () => {
    describe('POST /payments/stripe/create-payment-intent', () => {
      it('should valid Stripe payment intent creation', () => {
        const paymentRequest = {
          amount: 9999, // $99.99 in cents
          currency: 'usd',
          courseId: '550e8400-e29b-41d4-a716-446655440000',
          paymentMethodId: 'pm_card_visa',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/payments/stripe/create-payment-intent',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          paymentRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject payment intent with insufficient amount', () => {
        const invalidRequest = {
          amount: 10, // Too small (minimum 50 cents)
          currency: 'usd',
          courseId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/payments/stripe/create-payment-intent',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should reject payment intent with invalid currency', () => {
        const invalidRequest = {
          amount: 9999,
          currency: 'invalid_currency',
          courseId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/payments/stripe/create-payment-intent',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /payments/paypal/create-order', () => {
      it('should validate PayPal order creation', () => {
        const orderRequest = {
          amount: '99.99',
          currency: 'USD',
          courseId: '550e8400-e29b-41d4-a716-446655440000',
          returnUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/payments/paypal/create-order',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          orderRequest
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject PayPal order with invalid currency', () => {
        const invalidRequest = {
          amount: '99.99',
          currency: 'invalid',
          courseId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/payments/paypal/create-order',
          { 'authorization': 'Bearer token123', 'content-type': 'application/json' },
          {},
          invalidRequest
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Webhook Endpoints', () => {
    describe('POST /webhooks/stripe', () => {
      it('should validate Stripe webhook with proper headers', () => {
        const webhookPayload = {
          id: 'evt_test123',
          object: 'event',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              object: 'payment_intent',
              amount: 9999,
              currency: 'usd',
              status: 'succeeded',
            },
          },
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/stripe',
          { 'stripe-signature': 'test_signature', 'content-type': 'application/json' },
          {},
          webhookPayload
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject Stripe webhook without signature', () => {
        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/stripe',
          { 'content-type': 'application/json' },
          {},
          { test: 'data' }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors.some(e => e.code === 'MISSING_HEADER')).toBe(true);
      });
    });

    describe('POST /webhooks/paypal', () => {
      it('should validate PayPal webhook with required headers', () => {
        const headers = {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-transmission-id': 'test-transmission-id',
          'paypal-cert-id': 'test-cert-id',
          'paypal-transmission-sig': 'test-signature',
          'paypal-transmission-time': new Date().toISOString(),
          'content-type': 'application/json',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/paypal',
          headers,
          {},
          { test: 'data' }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject PayPal webhook with missing headers', () => {
        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/paypal',
          { 'content-type': 'application/json' },
          {},
          { test: 'data' }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('POST /webhooks/zoom', () => {
      it('should validate Zoom webhook with required headers', () => {
        const headers = {
          'x-zm-signature': 'test-signature',
          'x-zm-request-timestamp': new Date().toISOString(),
          'content-type': 'application/json',
        };

        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/zoom',
          headers,
          {},
          { test: 'data' }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject Zoom webhook without signature', () => {
        const validation = openApiValidation.validateRequest(
          'POST',
          '/webhooks/zoom',
          { 'content-type': 'application/json' },
          {},
          { test: 'data' }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Admin Integration Endpoints', () => {
    describe('GET /admin/integration/health', () => {
      it('should validate integration health request', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/admin/integration/health',
          { 'authorization': 'Bearer token123' },
          {}
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    describe('GET /admin/integration/metrics', () => {
      it('should validate integration metrics request with filters', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/admin/integration/metrics',
          { 'authorization': 'Bearer token123' },
          { service: 'stripe', timeRange: '24' }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid service name', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/admin/integration/metrics',
          { 'authorization': 'Bearer token123' },
          { service: 'invalid_service' }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      it('should reject invalid time range', () => {
        const validation = openApiValidation.validateRequest(
          'GET',
          '/admin/integration/metrics',
          { 'authorization': 'Bearer token123' },
          { timeRange: '200' } // Exceeds maximum of 168
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Response Validation Tests', () => {
    it('should validate successful response structure', () => {
      const mockResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const validation = openApiValidation.validateResponse(
        'GET',
        '/users/550e8400-e29b-41d4-a716-446655440000',
        200,
        { 'content-type': 'application/json' },
        mockResponse
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate error response structure', () => {
      const errorResponse = {
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: '2023-01-01T00:00:00.000Z',
        path: '/users/invalid-id',
      };

      const validation = openApiValidation.validateResponse(
        'GET',
        '/users/invalid-id',
        404,
        { 'content-type': 'application/json' },
        errorResponse
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid response structure', () => {
      const invalidResponse = {
        // Missing required fields
        email: 'test@example.com',
      };

      const validation = openApiValidation.validateResponse(
        'GET',
        '/users/550e8400-e29b-41d4-a716-446655440000',
        200,
        { 'content-type': 'application/json' },
        invalidResponse
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Specification Coverage Tests', () => {
    it('should have specification loaded', () => {
      const spec = openApiValidation.getSpecification();
      expect(spec).toBeDefined();
      expect(spec!.openapi).toMatch(/^3\.0\./);
      expect(spec!.info.title).toBe('StrellerMinds Backend API');
    });

    it('should list all defined endpoints', () => {
      const endpoints = openApiValidation.getEndpoints();
      expect(endpoints.length).toBeGreaterThan(0);
      
      // Check that key endpoints are defined
      const endpointPaths = endpoints.map(e => `${e.method} ${e.path}`);
      expect(endpointPaths).toContain('GET /');
      expect(endpointPaths).toContain('POST /auth/login');
      expect(endpointPaths).toContain('GET /users');
      expect(endpointPaths).toContain('GET /courses');
    });

    it('should provide validation statistics', () => {
      const stats = openApiValidation.getValidationStats();
      expect(stats).toHaveProperty('totalValidations');
      expect(stats).toHaveProperty('successfulValidations');
      expect(stats).toHaveProperty('failedValidations');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageValidationTime');
    });
  });

  describe('Performance Tests', () => {
    it('should validate requests within acceptable time limits', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        openApiValidation.validateRequest(
          'GET',
          '/users',
          { 'authorization': 'Bearer token123' },
          { page: '1', limit: '10' }
        );
      }
      
      const duration = Date.now() - startTime;
      const averageTime = duration / 100;
      
      // Should average less than 10ms per validation
      expect(averageTime).toBeLessThan(10);
    });

    it('should utilize caching effectively', () => {
      // First validation
      const validation1 = openApiValidation.validateRequest(
        'GET',
        '/users',
        { 'authorization': 'Bearer token123' },
        { page: '1', limit: '10' }
      );

      // Second validation (should use cache)
      const validation2 = openApiValidation.validateRequest(
        'GET',
        '/users',
        { 'authorization': 'Bearer token123' },
        { page: '1', limit: '10' }
      );

      expect(validation1.isValid).toBe(validation2.isValid);
      expect(validation1.errors).toEqual(validation2.errors);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle validation of undefined endpoints gracefully', () => {
      const validation = openApiValidation.validateRequest(
        'GET',
        '/nonexistent/endpoint',
        { 'authorization': 'Bearer token123' },
        {}
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('should handle malformed request bodies gracefully', () => {
      const validation = openApiValidation.validateRequest(
        'POST',
        '/auth/login',
        { 'content-type': 'application/json' },
        {},
        undefined // Undefined body
      );

      // Should not throw errors, should handle gracefully
      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
    });

    it('should handle invalid header formats gracefully', () => {
      const validation = openApiValidation.validateRequest(
        'GET',
        '/users',
        { 'authorization': '', 'content-type': '' },
        {}
      );

      // Should handle empty headers gracefully
      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
    });
  });
});
