import { app, contractHelper } from './setup';

describe('Users API Contract Tests', () => {
  describe('GET /users', () => {
    it('should conform to contract for users list', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/users',
        expectedStatus: 200,
        query: {
          page: 1,
          limit: 20
        }
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.body).toHaveProperty('data');
      expect(result.response.body).toHaveProperty('pagination');
      
      if (!result.validation.valid) {
        console.error('Validation errors:', result.validation.errors);
      }
      expect(result.validation.valid).toBe(true);
    });

    it('should handle pagination parameters correctly', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/users',
        expectedStatus: 200,
        query: {
          page: 2,
          limit: 10,
          cursor: 'eyJj...=='
        }
      });

      expect(result.response.status).toBe(200);
      expect(result.response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /users', () => {
    it('should conform to contract for user creation', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser123',
        role: 'STUDENT'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/users',
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

    it('should validate user creation schema', () => {
      const invalidUser = {
        email: 'not-an-email',
        firstName: '' // Empty string
      };

      const validation = contractHelper.validateRequestBody('POST', '/users', invalidUser);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /users/:id', () => {
    it('should conform to contract for user retrieval', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: `/users/${userId}`,
        expectedStatus: 404 // Expected for non-existent user
      });

      expect([200, 404]).toContain(result.response.status);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should conform to contract for user update', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'PATCH',
        path: `/users/${userId}`,
        expectedStatus: 404, // Expected for non-existent user
        body: updateData
      });

      expect([200, 404]).toContain(result.response.status);
    });
  });

  describe('POST /users/bulk-update', () => {
    it('should conform to contract for bulk update', async () => {
      const bulkData = {
        userIds: ['550e8400-e29b-41d4-a716-446655440000'],
        updates: {
          role: 'INSTRUCTOR'
        }
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/users/bulk-update',
        expectedStatus: 200,
        body: bulkData
      });

      expect(result.response.status).toBe(200);
      expect(result.response.body).toHaveProperty('success');
      expect(result.response.body).toHaveProperty('failed');
    });
  });
});
