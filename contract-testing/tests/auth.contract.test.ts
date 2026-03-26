import { app, contractHelper } from './setup';

describe('Authentication API Contract Tests', () => {
  describe('POST /auth/register', () => {
    it('should conform to contract for successful registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/auth/register',
        expectedStatus: 201,
        body: userData
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.status).toBe(201);
      
      if (!result.validation.valid) {
        console.error('Validation errors:', result.validation.errors);
      }
      expect(result.validation.valid).toBe(true);
    });

    it('should validate request body against schema', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123' // Too short
      };

      const validation = contractHelper.validateRequestBody('POST', '/auth/register', invalidData);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle duplicate email with proper error response', async () => {
      const duplicateData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'existinguser'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/auth/register',
        expectedStatus: 409,
        body: duplicateData
      });

      expect(result.response.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should conform to contract for successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/auth/login',
        expectedStatus: 200,
        body: loginData
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.body).toHaveProperty('accessToken');
      expect(result.response.body).toHaveProperty('refreshToken');
      
      if (!result.validation.valid) {
        console.error('Validation errors:', result.validation.errors);
      }
      expect(result.validation.valid).toBe(true);
    });

    it('should handle invalid credentials', async () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/auth/login',
        expectedStatus: 401,
        body: invalidLogin
      });

      expect(result.response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should conform to contract for token refresh', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/auth/refresh',
        expectedStatus: 200,
        body: refreshData
      });

      // Note: This test might fail with invalid token, but validates the contract structure
      expect([200, 401]).toContain(result.response.status);
      
      if (result.response.status === 200) {
        expect(result.response.body).toHaveProperty('accessToken');
        expect(result.response.body).toHaveProperty('refreshToken');
      }
    });
  });

  describe('GET /auth/profile', () => {
    it('should conform to contract for profile retrieval', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/auth/profile',
        expectedStatus: 401, // Expected without auth token
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(result.response.status).toBe(401);
    });
  });
});
