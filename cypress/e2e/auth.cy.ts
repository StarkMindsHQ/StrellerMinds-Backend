describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.cleanupTestData();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      cy.register(userData).then((response) => {
        cy.expectSuccess(response);
        expect(response.body.data.user.email).to.equal(userData.email);
        expect(response.body.data.user.firstName).to.equal(userData.firstName);
        expect(response.body.data.user.lastName).to.equal(userData.lastName);
        expect(response.body.data.user).not.to.have.property('password');
      });
    });

    it('should reject registration with invalid email', () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      cy.register(userData).then((response) => {
        cy.expectError(response, 400);
      });
    });

    it('should reject registration with weak password', () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      };

      cy.register(userData).then((response) => {
        cy.expectError(response, 400);
      });
    });

    it('should reject registration with duplicate email', () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // First registration
      cy.register(userData).then((response) => {
        cy.expectSuccess(response);
      });

      // Second registration with same email
      cy.register(userData).then((response) => {
        cy.expectError(response, 409);
      });
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Create a test user for login tests
      cy.createTestUser({
        email: 'login@example.com',
        password: 'TestPassword123!',
      });
    });

    it('should login successfully with valid credentials', () => {
      cy.login('login@example.com', 'TestPassword123!').then((authData) => {
        expect(authData).to.have.property('accessToken');
        expect(authData).to.have.property('refreshToken');
        expect(authData.user).to.have.property('email', 'login@example.com');
      });
    });

    it('should reject login with invalid credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'login@example.com',
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }).then((response) => {
        cy.expectError(response, 401);
      });
    });

    it('should reject login with missing fields', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'login@example.com',
        },
        failOnStatusCode: false,
      }).then((response) => {
        cy.expectError(response, 400);
      });
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeEach(() => {
      cy.createTestUser({
        email: 'refresh@example.com',
        password: 'TestPassword123!',
      }).then(() => {
        cy.login('refresh@example.com', 'TestPassword123!').then((authData) => {
          refreshToken = authData.refreshToken;
        });
      });
    });

    it('should refresh tokens successfully', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken },
      }).then((response) => {
        cy.expectSuccess(response);
        expect(response.body.data).to.have.property('accessToken');
        expect(response.body.data).to.have.property('refreshToken');
        // New refresh token should be different
        expect(response.body.data.refreshToken).not.to.equal(refreshToken);
      });
    });

    it('should reject refresh with invalid token', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken: 'invalid-token' },
        failOnStatusCode: false,
      }).then((response) => {
        cy.expectError(response, 401);
      });
    });
  });

  describe('User Profile', () => {
    beforeEach(() => {
      cy.createTestUser({
        email: 'profile@example.com',
        password: 'TestPassword123!',
      }).then(() => {
        cy.login('profile@example.com', 'TestPassword123!');
      });
    });

    it('should get user profile successfully', () => {
      cy.getUserProfile().then((response) => {
        cy.expectSuccess(response);
        expect(response.body.data.user).to.have.property('email', 'profile@example.com');
        expect(response.body.data.user).to.have.property('firstName');
        expect(response.body.data.user).to.have.property('lastName');
      });
    });

    it('should update user profile successfully', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
      };

      cy.updateProfile(updateData).then((response) => {
        cy.expectSuccess(response);
        expect(response.body.data.user.firstName).to.equal(updateData.firstName);
        expect(response.body.data.user.lastName).to.equal(updateData.lastName);
        expect(response.body.data.user.bio).to.equal(updateData.bio);
      });
    });

    it('should reject profile update without authentication', () => {
      cy.clearAuthState();
      
      cy.request({
        method: 'PUT',
        url: '/api/user/profile',
        body: { firstName: 'Updated' },
        failOnStatusCode: false,
      }).then((response) => {
        cy.expectError(response, 401);
      });
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.createTestUser({
        email: 'logout@example.com',
        password: 'TestPassword123!',
      }).then(() => {
        cy.login('logout@example.com', 'TestPassword123!');
      });
    });

    it('should logout successfully', () => {
      cy.logout().then(() => {
        // Verify tokens are cleared
        expect(window.localStorage.getItem('accessToken')).to.be.null;
        expect(window.localStorage.getItem('refreshToken')).to.be.null;
      });
    });

    it('should reject access after logout', () => {
      cy.logout();
      
      cy.request({
        method: 'GET',
        url: '/api/auth/profile',
        failOnStatusCode: false,
      }).then((response) => {
        cy.expectError(response, 401);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'TestPassword123!',
      };

      // Create user first
      cy.createTestUser(loginData);

      // Test rate limiting
      cy.testRateLimit('/api/auth/login', 5, 60000);
    });

    it('should enforce rate limits on registration attempts', () => {
      const userData = {
        email: 'ratelimit@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Test rate limiting
      cy.testRateLimit('/api/auth/register', 5, 60000);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', () => {
      cy.request('/api/auth/profile').then((response) => {
        // Check for security headers
        expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
        expect(response.headers).to.have.property('x-frame-options');
        expect(response.headers).to.have.property('x-xss-protection');
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', () => {
      cy.request({
        method: 'OPTIONS',
        url: '/api/auth/login',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      }).then((response) => {
        expect(response.status).to.equal(204);
        expect(response.headers).to.have.property('access-control-allow-origin');
        expect(response.headers).to.have.property('access-control-allow-methods');
        expect(response.headers).to.have.property('access-control-allow-headers');
      });
    });
  });
});
