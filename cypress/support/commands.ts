// Custom Cypress commands for API testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login user and store tokens
       * @param email - User email
       * @param password - User password
       */
      login(email: string, password: string): Chainable<any>;

      /**
       * Register a new user
       * @param userData - User registration data
       */
      register(userData: any): Chainable<any>;

      /**
       * Logout user and clear tokens
       */
      logout(): Chainable<void>;

      /**
       * Expect successful API response
       * @param response - Cypress response object
       */
      expectSuccess(response: any): Chainable<void>;

      /**
       * Expect error API response
       * @param response - Cypress response object
       * @param status - Expected HTTP status code
       */
      expectError(response: any, status: number): Chainable<void>;

      /**
       * Create test course
       * @param courseData - Course data
       */
      createCourse(courseData: any): Chainable<any>;

      /**
       * Get user profile
       */
      getUserProfile(): Chainable<any>;

      /**
       * Update user profile
       * @param profileData - Profile update data
       */
      updateProfile(profileData: any): Chainable<any>;

      /**
       * Get courses list
       * @param queryParams - Query parameters
       */
      getCourses(queryParams?: any): Chainable<any>;

      /**
       * Enroll in course
       * @param courseId - Course ID
       */
      enrollInCourse(courseId: string): Chainable<any>;
    }
  }
}

// Course management commands
Cypress.Commands.add('createCourse', (courseData) => {
  const token = window.localStorage.getItem('accessToken');
  return cy.request({
    method: 'POST',
    url: '/api/courses',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: courseData,
  });
});

Cypress.Commands.add('getCourses', (queryParams = {}) => {
  return cy.request({
    method: 'GET',
    url: '/api/courses',
    qs: queryParams,
  });
});

Cypress.Commands.add('enrollInCourse', (courseId) => {
  const token = window.localStorage.getItem('accessToken');
  return cy.request({
    method: 'POST',
    url: `/api/courses/${courseId}/enroll`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
});

// Profile management commands
Cypress.Commands.add('getUserProfile', () => {
  const token = window.localStorage.getItem('accessToken');
  return cy.request({
    method: 'GET',
    url: '/api/auth/profile',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
});

Cypress.Commands.add('updateProfile', (profileData) => {
  const token = window.localStorage.getItem('accessToken');
  return cy.request({
    method: 'PUT',
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: profileData,
  });
});

// Data factory commands
Cypress.Commands.add('createTestUser', (overrides = {}) => {
  const userData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
  return cy.register(userData);
});

Cypress.Commands.add('createTestCourse', (overrides = {}) => {
  const courseData = {
    title: `Test Course ${Date.now()}`,
    description: 'Test course description',
    price: 99.99,
    duration: 3600,
    level: 'BEGINNER',
    ...overrides,
  };
  return cy.createCourse(courseData);
});

// Utility commands
Cypress.Commands.add('waitForApiResponse', (url: string, timeout = 10000) => {
  cy.wait(`@${url}`, { timeout });
});

Cypress.Commands.add('checkApiResponse', (method: string, url: string, statusCode = 200) => {
  cy.intercept(method, url).as(`${method}-${url}`);
});

// Database cleanup commands (for test isolation)
Cypress.Commands.add('cleanupTestData', () => {
  cy.task('clearDatabase');
});

// File upload commands
Cypress.Commands.add('uploadFile', (fileName: string, mimeType: string = 'image/jpeg') => {
  return cy.fixture(fileName).then((fileContent) => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, mimeType);
    return new Cypress.Promise((resolve) => {
      const file = new File([blob], fileName, { type: mimeType });
      resolve(file);
    });
  });
});

// Authentication state management
Cypress.Commands.add('setAuthState', (accessToken: string, refreshToken: string) => {
  window.localStorage.setItem('accessToken', accessToken);
  window.localStorage.setItem('refreshToken', refreshToken);
});

Cypress.Commands.add('clearAuthState', () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
});

// API response validation helpers
Cypress.Commands.add('validateApiResponse', (response: any, expectedSchema: any) => {
  expect(response.body).to.have.property('success');
  expect(response.body).to.have.property('data');
  
  if (expectedSchema) {
    // Basic schema validation - can be extended with more sophisticated validation
    Object.keys(expectedSchema).forEach((key) => {
      expect(response.body.data).to.have.property(key);
    });
  }
});

// Rate limiting test helpers
Cypress.Commands.add('testRateLimit', (endpoint: string, maxRequests: number, windowMs: number) => {
  const requests = [];
  
  for (let i = 0; i < maxRequests + 1; i++) {
    requests.push(
      cy.request({
        method: 'GET',
        url: endpoint,
        failOnStatusCode: false,
      })
    );
  }
  
  return Promise.all(requests).then((responses) => {
    // First maxRequests should succeed, last one should fail with 429
    responses.slice(0, maxRequests).forEach((response) => {
      expect(response.status).to.not.equal(429);
    });
    expect(responses[maxRequests].status).to.equal(429);
  });
});

export {};
