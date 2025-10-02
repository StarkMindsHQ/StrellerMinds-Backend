// Import Cypress commands
import './commands';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // that we don't care about in tests
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }

  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }

  // Let other errors fail the test
  return true;
});

// Global hooks
beforeEach(() => {
  // Clear local storage and cookies before each test
  cy.clearLocalStorage();
  cy.clearCookies();

  // Set up API interceptors for common requests
  cy.intercept('GET', '/api/health', { fixture: 'health-check.json' }).as('healthCheck');
  cy.intercept('POST', '/api/auth/login', { fixture: 'auth/login-success.json' }).as('login');
  cy.intercept('POST', '/api/auth/register', { fixture: 'auth/register-success.json' }).as(
    'register',
  );
  cy.intercept('GET', '/api/auth/profile', { fixture: 'auth/profile.json' }).as('getProfile');
  cy.intercept('GET', '/api/courses', { fixture: 'courses/courses-list.json' }).as('getCourses');
});

// Custom assertions
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via API
       */
      loginViaAPI(email?: string, password?: string): Chainable<void>;

      /**
       * Custom command to login via UI
       */
      loginViaUI(email?: string, password?: string): Chainable<void>;

      /**
       * Custom command to register via API
       */
      registerViaAPI(userData?: any): Chainable<void>;

      /**
       * Custom command to register via UI
       */
      registerViaUI(userData?: any): Chainable<void>;

      /**
       * Custom command to logout
       */
      logout(): Chainable<void>;

      /**
       * Custom command to seed database
       */
      seedDatabase(data?: any): Chainable<void>;

      /**
       * Custom command to clear database
       */
      clearDatabase(): Chainable<void>;

      /**
       * Custom command to wait for page load
       */
      waitForPageLoad(): Chainable<void>;

      /**
       * Custom command to check accessibility
       */
      checkA11y(context?: string, options?: any): Chainable<void>;

      /**
       * Custom command to take visual snapshot
       */
      visualSnapshot(name?: string): Chainable<void>;

      /**
       * Custom command to fill form
       */
      fillForm(formData: Record<string, any>): Chainable<void>;

      /**
       * Custom command to upload file
       */
      uploadFile(selector: string, fileName: string, fileType?: string): Chainable<void>;

      /**
       * Custom command to wait for API call
       */
      waitForAPI(alias: string, timeout?: number): Chainable<void>;

      /**
       * Custom command to check toast message
       */
      checkToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): Chainable<void>;

      /**
       * Custom command to check loading state
       */
      checkLoading(shouldBeLoading?: boolean): Chainable<void>;

      /**
       * Custom command to navigate to page
       */
      navigateTo(page: string): Chainable<void>;

      /**
       * Custom command to check responsive design
       */
      checkResponsive(breakpoints?: string[]): Chainable<void>;

      /**
       * Custom command to mock API response
       */
      mockAPI(method: string, url: string, response: any, alias?: string): Chainable<void>;

      /**
       * Custom command to check email
       */
      checkEmail(emailType: string): Chainable<any>;

      /**
       * Custom command to wait for element to be stable
       */
      waitForStable(selector: string): Chainable<void>;

      /**
       * Custom command to check performance
       */
      checkPerformance(thresholds?: any): Chainable<void>;
    }
  }
}

// Add custom matchers
chai.use((chai, utils) => {
  chai.Assertion.addMethod('toBeAccessible', function () {
    const obj = this._obj;

    // Custom accessibility assertion logic
    this.assert(
      obj.violations.length === 0,
      `Expected no accessibility violations, but found ${obj.violations.length}`,
      `Expected accessibility violations, but found none`,
      0,
      obj.violations.length,
    );
  });

  chai.Assertion.addMethod('toHavePerformanceScore', function (expectedScore) {
    const obj = this._obj;

    this.assert(
      obj.score >= expectedScore,
      `Expected performance score to be at least ${expectedScore}, but got ${obj.score}`,
      `Expected performance score to be less than ${expectedScore}, but got ${obj.score}`,
      expectedScore,
      obj.score,
    );
  });
});

// Performance monitoring
Cypress.on('window:before:load', (win) => {
  // Add performance observer
  win.performance.mark('test-start');
});

// Error handling
Cypress.on('fail', (error, runnable) => {
  // Log additional context on test failure
  console.error('Test failed:', {
    test: runnable.title,
    error: error.message,
    stack: error.stack,
    url: Cypress.config('baseUrl'),
    viewport: Cypress.config('viewportWidth') + 'x' + Cypress.config('viewportHeight'),
  });

  throw error;
});

// Test data cleanup
after(() => {
  // Clean up test data after all tests
  cy.task('clearDatabase');
  cy.task('clearEmails');
});
