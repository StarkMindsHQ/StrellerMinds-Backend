describe('Complete User Journey E2E Tests', () => {
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('New User Onboarding Journey', () => {
    it('should complete full user registration and first course enrollment', () => {
      // Visit the application
      cy.visit('/');

      // Navigate to registration
      cy.get('[data-cy=register-button]').click();
      cy.url().should('include', '/register');

      // Fill registration form
      cy.get('[data-cy=email-input]').type('newuser@example.com');
      cy.get('[data-cy=username-input]').type('newuser123');
      cy.get('[data-cy=first-name-input]').type('John');
      cy.get('[data-cy=last-name-input]').type('Doe');
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=confirm-password-input]').type('Password123!');
      cy.get('[data-cy=terms-checkbox]').check();

      // Submit registration
      cy.get('[data-cy=register-submit]').click();

      // Verify successful registration
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=welcome-message]').should('contain', 'Welcome John');
      cy.get('[data-cy=verification-notice]').should('be.visible');

      // Complete email verification (mock)
      cy.visit('/verify-email?token=mock-verification-token');
      cy.get('[data-cy=verification-success]').should('be.visible');

      // Complete profile setup
      cy.get('[data-cy=complete-profile-button]').click();
      cy.get('[data-cy=bio-input]').type('Passionate learner interested in technology');
      cy.get('[data-cy=phone-input]').type('+1234567890');
      cy.get('[data-cy=save-profile-button]').click();

      // Browse courses
      cy.get('[data-cy=courses-link]').click();
      cy.url().should('include', '/courses');

      // Filter courses
      cy.get('[data-cy=category-filter]').select('programming');
      cy.get('[data-cy=level-filter]').select('beginner');

      // Select first course
      cy.get('[data-cy=course-card]').first().click();
      cy.url().should('include', '/courses/');

      // View course details
      cy.get('[data-cy=course-title]').should('be.visible');
      cy.get('[data-cy=course-description]').should('be.visible');
      cy.get('[data-cy=course-curriculum]').should('be.visible');

      // Enroll in course
      cy.get('[data-cy=enroll-button]').click();
      cy.get('[data-cy=enrollment-modal]').should('be.visible');
      cy.get('[data-cy=confirm-enrollment]').click();

      // Verify enrollment
      cy.get('[data-cy=enrollment-success]').should('contain', 'Successfully enrolled');
      cy.get('[data-cy=start-learning-button]').click();

      // Start first lesson
      cy.get('[data-cy=lesson-item]').first().click();
      cy.get('[data-cy=video-player]').should('be.visible');
      cy.get('[data-cy=lesson-content]').should('be.visible');

      // Mark lesson as complete
      cy.get('[data-cy=complete-lesson-button]').click();
      cy.get('[data-cy=lesson-progress]').should('contain', '100%');

      // Navigate to dashboard
      cy.get('[data-cy=dashboard-link]').click();
      cy.get('[data-cy=my-courses]').should('contain', '1 course');
      cy.get('[data-cy=learning-streak]').should('be.visible');
    });
  });

  describe('Premium Subscription Journey', () => {
    beforeEach(() => {
      // Login as existing user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('existinguser@example.com');
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=login-button]').click();
      cy.url().should('include', '/dashboard');
    });

    it('should upgrade to premium subscription', () => {
      // Navigate to subscription page
      cy.get('[data-cy=upgrade-premium-button]').click();
      cy.url().should('include', '/subscription');

      // View subscription plans
      cy.get('[data-cy=plan-card]').should('have.length.greaterThan', 1);
      cy.get('[data-cy=premium-plan]').within(() => {
        cy.get('[data-cy=plan-price]').should('contain', '$29.99');
        cy.get('[data-cy=plan-features]').should('be.visible');
      });

      // Select premium plan
      cy.get('[data-cy=select-premium-plan]').click();

      // Enter payment details
      cy.get('[data-cy=payment-form]').should('be.visible');
      cy.get('[data-cy=card-number-input]').type('4242424242424242');
      cy.get('[data-cy=card-expiry-input]').type('12/25');
      cy.get('[data-cy=card-cvc-input]').type('123');
      cy.get('[data-cy=card-name-input]').type('John Doe');

      // Submit payment
      cy.get('[data-cy=subscribe-button]').click();

      // Handle 3D Secure verification (mock)
      cy.get('[data-cy=3ds-modal]').should('be.visible');
      cy.get('[data-cy=3ds-complete-button]').click();

      // Verify successful subscription
      cy.get('[data-cy=subscription-success]').should('be.visible');
      cy.get('[data-cy=premium-badge]').should('be.visible');

      // Access premium features
      cy.get('[data-cy=advanced-courses]').should('be.visible');
      cy.get('[data-cy=download-videos]').should('be.visible');
      cy.get('[data-cy=priority-support]').should('be.visible');

      // Check subscription status
      cy.visit('/account/subscription');
      cy.get('[data-cy=subscription-status]').should('contain', 'Active');
      cy.get('[data-cy=next-billing-date]').should('be.visible');
    });

    it('should manage subscription settings', () => {
      // Visit subscription management
      cy.visit('/account/subscription');

      // Update payment method
      cy.get('[data-cy=update-payment-method]').click();
      cy.get('[data-cy=card-number-input]').type('4000000000000077');
      cy.get('[data-cy=card-expiry-input]').type('11/24');
      cy.get('[data-cy=card-cvc-input]').type('456');
      cy.get('[data-cy=save-payment-method]').click();

      // Change subscription plan
      cy.get('[data-cy=change-plan]').click();
      cy.get('[data-cy=annual-plan]').click();
      cy.get('[data-cy=confirm-plan-change]').click();

      // Verify plan change
      cy.get('[data-cy=plan-updated]').should('be.visible');
      cy.get('[data-cy=billing-cycle]').should('contain', 'Annual');
    });
  });

  describe('Learning Path Journey', () => {
    beforeEach(() => {
      // Login as premium user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('premiumuser@example.com');
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=login-button]').click();
    });

    it('should complete a learning path', () => {
      // Browse learning paths
      cy.visit('/learning-paths');
      cy.get('[data-cy=learning-path-card]').should('have.length.greaterThan', 0);

      // Select a learning path
      cy.get('[data-cy=learning-path-card]').first().within(() => {
        cy.get('[data-cy=path-title]').should('be.visible');
        cy.get('[data-cy=path-duration]').should('be.visible');
        cy.get('[data-cy=path-difficulty]').should('be.visible');
        cy.get('[data-cy=start-path-button]').click();
      });

      // View learning path overview
      cy.url().should('include', '/learning-paths/');
      cy.get('[data-cy=path-overview]').should('be.visible');
      cy.get('[data-cy=path-modules]').should('have.length.greaterThan', 0);

      // Start first module
      cy.get('[data-cy=module-item]').first().within(() => {
        cy.get('[data-cy=module-title]').should('be.visible');
        cy.get('[data-cy=start-module-button]').click();
      });

      // Complete lessons in module
      cy.get('[data-cy=lesson-list]').should('be.visible');
      cy.get('[data-cy=lesson-item]').each(($lesson, index) => {
        if (index < 3) { // Complete first 3 lessons
          cy.wrap($lesson).click();
          cy.get('[data-cy=lesson-content]').should('be.visible');
          cy.get('[data-cy=mark-complete-button]').click();
          cy.get('[data-cy=lesson-completed]').should('be.visible');
          cy.go('back');
        }
      });

      // Track progress
      cy.get('[data-cy=path-progress]').should('contain', '%');
      cy.get('[data-cy=completed-lessons]').should('contain', '3');

      // Take module quiz
      cy.get('[data-cy=module-quiz-button]').click();
      cy.get('[data-cy=quiz-question]').should('be.visible');
      
      // Answer quiz questions
      cy.get('[data-cy=quiz-option]').first().click();
      cy.get('[data-cy=next-question-button]').click();
      cy.get('[data-cy=quiz-option]').eq(1).click();
      cy.get('[data-cy=submit-quiz-button]').click();

      // View quiz results
      cy.get('[data-cy=quiz-results]').should('be.visible');
      cy.get('[data-cy=quiz-score]').should('be.visible');
      cy.get('[data-cy=module-completed]').should('be.visible');

      // Continue to next module
      cy.get('[data-cy=continue-learning-button]').click();
    });

    it('should earn certificates and achievements', () => {
      // Visit achievements page
      cy.visit('/achievements');
      cy.get('[data-cy=achievements-grid]').should('be.visible');

      // Check earned achievements
      cy.get('[data-cy=achievement-badge]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=achievement-details]').should('be.visible');

      // View certificates
      cy.get('[data-cy=certificates-tab]').click();
      cy.get('[data-cy=certificate-list]').should('be.visible');

      // Download certificate
      cy.get('[data-cy=certificate-item]').first().within(() => {
        cy.get('[data-cy=download-certificate]').click();
      });

      // Verify download
      cy.readFile('cypress/downloads/certificate.pdf').should('exist');
    });
  });

  describe('Social Learning Journey', () => {
    beforeEach(() => {
      // Login as active user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('socialuser@example.com');
      cy.get('[data-cy=password-input]').type('Password123!');
      cy.get('[data-cy=login-button]').click();
    });

    it('should participate in community features', () => {
      // Visit forum
      cy.visit('/forum');
      cy.get('[data-cy=forum-categories]').should('be.visible');

      // Join discussion
      cy.get('[data-cy=forum-category]').first().click();
      cy.get('[data-cy=discussion-thread]').first().click();
      cy.get('[data-cy=discussion-content]').should('be.visible');

      // Add reply to discussion
      cy.get('[data-cy=reply-textarea]').type('This is a helpful contribution to the discussion.');
      cy.get('[data-cy=post-reply-button]').click();
      cy.get('[data-cy=reply-posted]').should('be.visible');

      // Create new discussion
      cy.get('[data-cy=new-discussion-button]').click();
      cy.get('[data-cy=discussion-title]').type('Question about advanced JavaScript concepts');
      cy.get('[data-cy=discussion-content]').type('I have a question about closures and prototypes...');
      cy.get('[data-cy=submit-discussion]').click();

      // Verify discussion created
      cy.get('[data-cy=discussion-created]').should('be.visible');
      cy.get('[data-cy=discussion-title]').should('contain', 'advanced JavaScript');

      // Participate in study group
      cy.visit('/study-groups');
      cy.get('[data-cy=study-group-card]').first().within(() => {
        cy.get('[data-cy=join-group-button]').click();
      });

      // Confirm joining
      cy.get('[data-cy=join-group-confirm]').click();
      cy.get('[data-cy=group-joined]').should('be.visible');

      // Participate in group chat
      cy.get('[data-cy=group-chat]').should('be.visible');
      cy.get('[data-cy=chat-input]').type('Hello everyone! Excited to learn together.');
      cy.get('[data-cy=send-message-button]').click();
      cy.get('[data-cy=message-sent]').should('be.visible');
    });
  });

  describe('Mobile Responsive Journey', () => {
    beforeEach(() => {
      // Set mobile viewport
      cy.viewport('iphone-x');
    });

    it('should complete user journey on mobile', () => {
      // Visit mobile site
      cy.visit('/');

      // Test mobile navigation
      cy.get('[data-cy=mobile-menu-button]').click();
      cy.get('[data-cy=mobile-menu]').should('be.visible');

      // Navigate to courses
      cy.get('[data-cy=mobile-courses-link]').click();
      cy.url().should('include', '/courses');

      // Test mobile course view
      cy.get('[data-cy=course-card]').first().click();
      cy.get('[data-cy=mobile-course-layout]').should('be.visible');

      // Test mobile video player
      cy.get('[data-cy=mobile-video-player]').should('be.visible');
      cy.get('[data-cy=play-video-button]').click();
      cy.get('[data-cy=video-controls]').should('be.visible');

      // Test mobile quiz
      cy.get('[data-cy=mobile-quiz-button]').click();
      cy.get('[data-cy=mobile-quiz-layout]').should('be.visible');
      cy.get('[data-cy=quiz-option]').first().click();
      cy.get('[data-cy=mobile-submit-button]').click();

      // Test mobile dashboard
      cy.get('[data-cy=mobile-menu-button]').click();
      cy.get('[data-cy=mobile-dashboard-link]').click();
      cy.get('[data-cy=mobile-dashboard]').should('be.visible');
    });
  });

  describe('Error Handling Journey', () => {
    it('should handle network errors gracefully', () => {
      // Intercept network requests to simulate errors
      cy.intercept('GET', '/api/courses', { forceNetworkError: true });
      
      cy.visit('/courses');
      cy.get('[data-cy=error-message]').should('be.visible');
      cy.get('[data-cy=retry-button]').should('be.visible');

      // Test retry functionality
      cy.intercept('GET', '/api/courses', { fixture: 'courses.json' });
      cy.get('[data-cy=retry-button]').click();
      cy.get('[data-cy=course-list]').should('be.visible');
    });

    it('should handle authentication errors', () => {
      // Try to access protected route without login
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      cy.get('[data-cy=auth-required-message]').should('be.visible');

      // Try to login with invalid credentials
      cy.get('[data-cy=email-input]').type('invalid@example.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();
      cy.get('[data-cy=login-error]').should('be.visible');
    });

    it('should handle form validation errors', () => {
      cy.visit('/register');
      
      // Submit empty form
      cy.get('[data-cy=register-submit]').click();
      cy.get('[data-cy=validation-error]').should('have.length.greaterThan', 0);

      // Submit invalid email
      cy.get('[data-cy=email-input]').type('invalid-email');
      cy.get('[data-cy=password-input]').type('123');
      cy.get('[data-cy=register-submit]').click();
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('be.visible');
    });
  });

  describe('Performance Journey', () => {
    it('should meet performance expectations', () => {
      // Measure page load times
      cy.visit('/');
      cy.get('[data-cy=main-content]').should('be.visible');
      
      // Check Lighthouse performance metrics
      cy.lighthouse({
        performance: 80,
        accessibility: 90,
        'best-practices': 80,
        seo: 80,
      });

      // Test large list performance
      cy.visit('/courses');
      cy.get('[data-cy=course-list]').should('be.visible');
      
      // Scroll through long list
      cy.get('[data-cy=course-list]').scrollTo('bottom');
      cy.get('[data-cy=loading-indicator]').should('not.exist');
    });
  });
});
