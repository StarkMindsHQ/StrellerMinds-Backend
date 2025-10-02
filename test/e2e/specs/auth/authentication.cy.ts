describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      };

      cy.navigateTo('register');

      // Fill registration form
      cy.fillForm(userData);

      // Submit form
      cy.get('[data-cy=register-button]').click();

      // Check for successful registration
      cy.checkToast('Registration successful', 'success');
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
      cy.get('[data-cy=user-name]').should('contain.text', userData.name);
    });

    it('should show validation errors for invalid data', () => {
      cy.navigateTo('register');

      // Try to submit empty form
      cy.get('[data-cy=register-button]').click();

      // Check validation errors
      cy.get('[data-cy=email-error]').should('be.visible').and('contain.text', 'Email is required');
      cy.get('[data-cy=password-error]')
        .should('be.visible')
        .and('contain.text', 'Password is required');
      cy.get('[data-cy=name-error]').should('be.visible').and('contain.text', 'Name is required');
    });

    it('should show error for invalid email format', () => {
      cy.navigateTo('register');

      cy.fillForm({
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      });

      cy.get('[data-cy=register-button]').click();

      cy.get('[data-cy=email-error]')
        .should('be.visible')
        .and('contain.text', 'Invalid email format');
    });

    it('should show error for weak password', () => {
      cy.navigateTo('register');

      cy.fillForm({
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      });

      cy.get('[data-cy=register-button]').click();

      cy.get('[data-cy=password-error]')
        .should('be.visible')
        .and('contain.text', 'Password must be at least 8 characters');
    });

    it('should show error for duplicate email', () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      };

      // Create user via API first
      cy.registerViaAPI(userData);
      cy.logout();

      // Try to register with same email
      cy.navigateTo('register');
      cy.fillForm(userData);
      cy.get('[data-cy=register-button]').click();

      cy.checkToast('Email already exists', 'error');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Create test user
      cy.registerViaAPI({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      });
      cy.logout();
    });

    it('should login with valid credentials', () => {
      cy.navigateTo('login');

      cy.fillForm({
        email: 'testuser@example.com',
        password: 'password123',
      });

      cy.get('[data-cy=login-button]').click();

      // Check successful login
      cy.checkToast('Login successful', 'success');
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.navigateTo('login');

      cy.fillForm({
        email: 'testuser@example.com',
        password: 'wrongpassword',
      });

      cy.get('[data-cy=login-button]').click();

      cy.checkToast('Invalid credentials', 'error');
      cy.url().should('include', '/login');
    });

    it('should show error for non-existent user', () => {
      cy.navigateTo('login');

      cy.fillForm({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      cy.get('[data-cy=login-button]').click();

      cy.checkToast('Invalid credentials', 'error');
    });

    it('should show validation errors for empty fields', () => {
      cy.navigateTo('login');

      cy.get('[data-cy=login-button]').click();

      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('be.visible');
    });

    it('should remember user session after page refresh', () => {
      cy.loginViaUI('testuser@example.com', 'password123');

      // Refresh page
      cy.reload();

      // Should still be logged in
      cy.get('[data-cy=user-menu]').should('be.visible');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.registerViaAPI({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      });
      cy.logout();
    });

    it('should send password reset email', () => {
      cy.navigateTo('login');
      cy.get('[data-cy=forgot-password-link]').click();

      cy.url().should('include', '/forgot-password');

      cy.fillForm({
        email: 'testuser@example.com',
      });

      cy.get('[data-cy=send-reset-button]').click();

      cy.checkToast('Password reset email sent', 'success');

      // Check that email was sent
      cy.checkEmail('Password Reset').then((email) => {
        expect(email.to).to.include('testuser@example.com');
        expect(email.html).to.include('reset your password');
      });
    });

    it('should not reveal if email does not exist', () => {
      cy.navigateTo('login');
      cy.get('[data-cy=forgot-password-link]').click();

      cy.fillForm({
        email: 'nonexistent@example.com',
      });

      cy.get('[data-cy=send-reset-button]').click();

      // Should show same success message for security
      cy.checkToast('Password reset email sent', 'success');
    });

    it('should reset password with valid token', () => {
      // This would require implementing password reset token generation
      // and email parsing in the test environment
      cy.skip('Requires email token parsing implementation');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.registerViaAPI({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      });
    });

    it('should logout successfully', () => {
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();

      // Should redirect to home page
      cy.url().should('not.include', '/dashboard');
      cy.get('[data-cy=login-button]').should('be.visible');

      // Should clear user session
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
        expect(win.localStorage.getItem('user')).to.be.null;
      });
    });

    it('should handle logout when session expires', () => {
      // Mock expired token
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'expired-token');
      });

      // Try to access protected route
      cy.visit('/dashboard');

      // Should redirect to login
      cy.url().should('include', '/login');
      cy.checkToast('Session expired', 'warning');
    });
  });

  describe('Social Authentication', () => {
    it('should handle Google OAuth flow', () => {
      cy.navigateTo('login');

      // Mock Google OAuth response
      cy.window().then((win) => {
        // Simulate successful Google OAuth
        win.postMessage(
          {
            type: 'GOOGLE_AUTH_SUCCESS',
            user: {
              email: 'google@example.com',
              name: 'Google User',
              provider: 'google',
            },
          },
          '*',
        );
      });

      cy.get('[data-cy=google-login-button]').click();

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should handle OAuth errors', () => {
      cy.navigateTo('login');

      // Mock OAuth error
      cy.window().then((win) => {
        win.postMessage(
          {
            type: 'GOOGLE_AUTH_ERROR',
            error: 'access_denied',
          },
          '*',
        );
      });

      cy.get('[data-cy=google-login-button]').click();

      cy.checkToast('Authentication failed', 'error');
      cy.url().should('include', '/login');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible on login page', () => {
      cy.navigateTo('login');
      cy.checkA11y();
    });

    it('should be accessible on register page', () => {
      cy.navigateTo('register');
      cy.checkA11y();
    });

    it('should support keyboard navigation', () => {
      cy.navigateTo('login');

      // Tab through form elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'email-input');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'password-input');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'login-button');
    });
  });

  describe('Performance', () => {
    it('should load login page quickly', () => {
      cy.visit('/login');
      cy.checkPerformance({
        loadTime: 2000,
        firstContentfulPaint: 1500,
      });
    });

    it('should handle login request quickly', () => {
      cy.registerViaAPI();
      cy.logout();

      cy.navigateTo('login');

      const startTime = Date.now();
      cy.loginViaUI();

      cy.then(() => {
        const endTime = Date.now();
        const loginTime = endTime - startTime;
        expect(loginTime).to.be.lessThan(3000);
      });
    });
  });
});
