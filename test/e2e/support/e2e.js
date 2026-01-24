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
    cy.intercept('POST', '/api/auth/register', { fixture: 'auth/register-success.json' }).as('register');
    cy.intercept('GET', '/api/auth/profile', { fixture: 'auth/profile.json' }).as('getProfile');
    cy.intercept('GET', '/api/courses', { fixture: 'courses/courses-list.json' }).as('getCourses');
});
// Add custom matchers
chai.use((chai, utils) => {
    chai.Assertion.addMethod('toBeAccessible', function () {
        const obj = this._obj;
        // Custom accessibility assertion logic
        this.assert(obj.violations.length === 0, `Expected no accessibility violations, but found ${obj.violations.length}`, `Expected accessibility violations, but found none`, 0, obj.violations.length);
    });
    chai.Assertion.addMethod('toHavePerformanceScore', function (expectedScore) {
        const obj = this._obj;
        this.assert(obj.score >= expectedScore, `Expected performance score to be at least ${expectedScore}, but got ${obj.score}`, `Expected performance score to be less than ${expectedScore}, but got ${obj.score}`, expectedScore, obj.score);
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
