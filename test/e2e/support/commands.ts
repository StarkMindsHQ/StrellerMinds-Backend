/// <reference types="cypress" />

// Authentication Commands
Cypress.Commands.add('loginViaAPI', (email?: string, password?: string) => {
  const credentials = {
    email: email || Cypress.env('testUser').email,
    password: password || Cypress.env('testUser').password,
  };

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: credentials,
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('access_token');

    // Store tokens in local storage
    window.localStorage.setItem('access_token', response.body.access_token);
    window.localStorage.setItem('refresh_token', response.body.refresh_token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

Cypress.Commands.add('loginViaUI', (email?: string, password?: string) => {
  const credentials = {
    email: email || Cypress.env('testUser').email,
    password: password || Cypress.env('testUser').password,
  };

  cy.visit('/login');
  cy.get('[data-cy=email-input]').type(credentials.email);
  cy.get('[data-cy=password-input]').type(credentials.password);
  cy.get('[data-cy=login-button]').click();

  // Wait for successful login
  cy.url().should('not.include', '/login');
  cy.get('[data-cy=user-menu]').should('be.visible');
});

Cypress.Commands.add('registerViaAPI', (userData?: any) => {
  const defaultUserData = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
  };

  const user = { ...defaultUserData, ...userData };

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: user,
  }).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body).to.have.property('access_token');

    // Store tokens in local storage
    window.localStorage.setItem('access_token', response.body.access_token);
    window.localStorage.setItem('refresh_token', response.body.refresh_token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

Cypress.Commands.add('registerViaUI', (userData?: any) => {
  const defaultUserData = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
  };

  const user = { ...defaultUserData, ...userData };

  cy.visit('/register');
  cy.get('[data-cy=email-input]').type(user.email);
  cy.get('[data-cy=password-input]').type(user.password);
  cy.get('[data-cy=name-input]').type(user.name);
  cy.get('[data-cy=first-name-input]').type(user.firstName);
  cy.get('[data-cy=last-name-input]').type(user.lastName);
  cy.get('[data-cy=register-button]').click();

  // Wait for successful registration
  cy.url().should('not.include', '/register');
  cy.get('[data-cy=user-menu]').should('be.visible');
});

Cypress.Commands.add('logout', () => {
  // Clear local storage
  cy.clearLocalStorage();

  // If on a page with logout button, click it
  cy.get('body').then(($body) => {
    if ($body.find('[data-cy=logout-button]').length > 0) {
      cy.get('[data-cy=logout-button]').click();
    }
  });

  // Verify logout
  cy.visit('/');
  cy.get('[data-cy=login-button]').should('be.visible');
});

// Database Commands
Cypress.Commands.add('seedDatabase', (data?: any) => {
  cy.task('seedDatabase', data);
});

Cypress.Commands.add('clearDatabase', () => {
  cy.task('clearDatabase');
});

// Utility Commands
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-cy=loading-spinner]').should('not.exist');
  cy.get('[data-cy=page-content]').should('be.visible');
});

Cypress.Commands.add('fillForm', (formData: Record<string, any>) => {
  Object.entries(formData).forEach(([field, value]) => {
    if (typeof value === 'string') {
      cy.get(`[data-cy=${field}-input]`).clear().type(value);
    } else if (typeof value === 'boolean') {
      if (value) {
        cy.get(`[data-cy=${field}-checkbox]`).check();
      } else {
        cy.get(`[data-cy=${field}-checkbox]`).uncheck();
      }
    } else if (Array.isArray(value)) {
      // Handle select multiple
      cy.get(`[data-cy=${field}-select]`).select(value);
    } else {
      cy.get(`[data-cy=${field}-select]`).select(value.toString());
    }
  });
});

Cypress.Commands.add('uploadFile', (selector: string, fileName: string, fileType?: string) => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    cy.get(selector).selectFile({
      contents: Cypress.Buffer.from(fileContent, 'base64'),
      fileName,
      mimeType: fileType || 'application/octet-stream',
    });
  });
});

Cypress.Commands.add('waitForAPI', (alias: string, timeout?: number) => {
  cy.wait(`@${alias}`, { timeout: timeout || 10000 });
});

Cypress.Commands.add(
  'checkToast',
  (message: string, type?: 'success' | 'error' | 'warning' | 'info') => {
    cy.get('[data-cy=toast]').should('be.visible').and('contain.text', message);

    if (type) {
      cy.get('[data-cy=toast]').should('have.class', `toast-${type}`);
    }

    // Wait for toast to disappear
    cy.get('[data-cy=toast]').should('not.exist', { timeout: 10000 });
  },
);

Cypress.Commands.add('checkLoading', (shouldBeLoading?: boolean) => {
  if (shouldBeLoading !== false) {
    cy.get('[data-cy=loading-spinner]').should('be.visible');
  } else {
    cy.get('[data-cy=loading-spinner]').should('not.exist');
  }
});

Cypress.Commands.add('navigateTo', (page: string) => {
  const routes = {
    home: '/',
    login: '/login',
    register: '/register',
    dashboard: '/dashboard',
    courses: '/courses',
    profile: '/profile',
    settings: '/settings',
  };

  const route = routes[page] || page;
  cy.visit(route);
  cy.waitForPageLoad();
});

Cypress.Commands.add('checkResponsive', (breakpoints?: string[]) => {
  const defaultBreakpoints = ['mobile', 'tablet', 'desktop'];
  const testBreakpoints = breakpoints || defaultBreakpoints;

  const viewports = {
    mobile: [375, 667],
    tablet: [768, 1024],
    desktop: [1280, 720],
  };

  testBreakpoints.forEach((breakpoint) => {
    const [width, height] = viewports[breakpoint];
    cy.viewport(width, height);
    cy.wait(500); // Allow time for responsive changes

    // Take screenshot for visual comparison
    cy.screenshot(`responsive-${breakpoint}`);
  });

  // Reset to default viewport
  cy.viewport(1280, 720);
});

Cypress.Commands.add('mockAPI', (method: string, url: string, response: any, alias?: string) => {
  const interceptAlias = alias || `mock${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`;

  cy.intercept(method, url, response).as(interceptAlias);

  return cy.wrap(interceptAlias);
});

Cypress.Commands.add('checkEmail', (emailType: string) => {
  cy.task('getLastEmail').then((email) => {
    expect(email).to.not.be.null;
    expect(email.subject).to.include(emailType);
    return cy.wrap(email);
  });
});

Cypress.Commands.add('waitForStable', (selector: string) => {
  let previousPosition: any;

  cy.get(selector).then(($el) => {
    previousPosition = $el.offset();
  });

  cy.wait(100);

  cy.get(selector).should(($el) => {
    const currentPosition = $el.offset();
    expect(currentPosition.top).to.equal(previousPosition.top);
    expect(currentPosition.left).to.equal(previousPosition.left);
  });
});

Cypress.Commands.add('checkPerformance', (thresholds?: any) => {
  const defaultThresholds = {
    loadTime: 3000,
    firstContentfulPaint: 2000,
    largestContentfulPaint: 4000,
  };

  const performanceThresholds = { ...defaultThresholds, ...thresholds };

  cy.window().then((win) => {
    const performance = win.performance;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    const loadTime = navigation.loadEventEnd - navigation.navigationStart;
    expect(loadTime).to.be.lessThan(performanceThresholds.loadTime);

    // Check other performance metrics if available
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

    if (fcp) {
      expect(fcp.startTime).to.be.lessThan(performanceThresholds.firstContentfulPaint);
    }
  });
});

// Accessibility Commands (requires cypress-axe)
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  cy.injectAxe();
  cy.checkA11y(context, options);
});

// Visual Testing Commands (requires cypress-visual-regression)
Cypress.Commands.add('visualSnapshot', (name?: string) => {
  const snapshotName = name || Cypress.currentTest.title;
  cy.compareSnapshot(snapshotName);
});
