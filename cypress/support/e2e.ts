// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add global Cypress configuration
beforeEach(() => {
  // Clear local storage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Add custom commands for API testing
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('accessToken', response.body.data.accessToken);
    window.localStorage.setItem('refreshToken', response.body.data.refreshToken);
    return response.body.data;
  });
});

Cypress.Commands.add('register', (userData: any) => {
  return cy.request({
    method: 'POST',
    url: '/api/auth/register',
    body: userData,
  });
});

Cypress.Commands.add('logout', () => {
  const token = window.localStorage.getItem('accessToken');
  if (token) {
    cy.request({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Add API response assertion helpers
Cypress.Commands.add('expectSuccess', (response: any) => {
  expect(response.status).to.be.oneOf([200, 201]);
  expect(response.body).to.have.property('success', true);
  expect(response.body).to.have.property('data');
});

Cypress.Commands.add('expectError', (response: any, status: number) => {
  expect(response.status).to.equal(status);
  expect(response.body).to.have.property('success', false);
  expect(response.body).to.have.property('message');
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // You can customize this based on your needs
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});
