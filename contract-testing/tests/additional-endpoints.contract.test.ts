import { app, contractHelper } from './setup';

describe('Course Management API Contract Tests', () => {
  describe('GET /courses', () => {
    it('should conform to contract for courses list', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/courses',
        expectedStatus: 200,
        query: {
          page: 1,
          limit: 20
        }
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.body).toHaveProperty('data');
      expect(result.response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /courses', () => {
    it('should conform to contract for course creation', async () => {
      const courseData = {
        title: 'Introduction to API Testing',
        description: 'Learn comprehensive API testing strategies',
        category: 'Testing',
        level: 'BEGINNER',
        duration: 3600, // 1 hour in seconds
        price: 99.99
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/courses',
        expectedStatus: 401, // Expected without auth
        body: courseData
      });

      expect([201, 401]).toContain(result.response.status);
    });
  });
});

describe('Payment API Contract Tests', () => {
  describe('POST /payments/create-intent', () => {
    it('should conform to contract for payment intent creation', async () => {
      const paymentData = {
        amount: 9999, // $99.99 in cents
        currency: 'usd',
        courseId: 'course-123',
        userId: 'user-123'
      };

      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/payments/create-intent',
        expectedStatus: 401, // Expected without auth
        body: paymentData
      });

      expect([200, 401]).toContain(result.response.status);
    });
  });
});

describe('Files API Contract Tests', () => {
  describe('POST /files/upload', () => {
    it('should conform to contract for file upload', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'POST',
        path: '/files/upload',
        expectedStatus: 401, // Expected without auth
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      expect([200, 401]).toContain(result.response.status);
    });
  });
});

describe('Health API Contract Tests', () => {
  describe('GET /health', () => {
    it('should conform to contract for health check', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/health',
        expectedStatus: 200
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.body).toHaveProperty('status');
      expect(result.response.status).toBe(200);
    });
  });

  describe('GET /health/detailed', () => {
    it('should conform to contract for detailed health check', async () => {
      const result = await contractHelper.makeRequestAndValidate({
        method: 'GET',
        path: '/health/detailed',
        expectedStatus: 200
      });

      expect(result.contractValid).toBe(true);
      expect(result.response.body).toHaveProperty('status');
      expect(result.response.body).toHaveProperty('checks');
    });
  });
});
