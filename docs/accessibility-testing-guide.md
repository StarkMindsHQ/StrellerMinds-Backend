# Accessibility Testing Guide for StrellerMinds

## Overview

This guide provides step-by-step instructions for testing accessibility features in the StrellerMinds platform. It covers automated testing, manual testing procedures, and user testing methodologies.

## Automated Testing Setup

### 1. Install Testing Dependencies

```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/playwright axe-core jest-axe
npm install --save-dev lighthouse pa11y
```

### 2. Configure Jest for Accessibility Testing

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/test/setup-accessibility.js'],
  testEnvironment: 'jsdom',
};
```

```javascript
// test/setup-accessibility.js
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
```

### 3. Example Accessibility Tests

```typescript
// test/accessibility/user-settings.test.ts
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import UserSettingsPage from '../src/pages/UserSettings';

describe('User Settings Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<UserSettingsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', async () => {
    const { container } = render(<UserSettingsPage />);
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    // Check that there's only one h1
    const h1Elements = container.querySelectorAll('h1');
    expect(h1Elements).toHaveLength(1);

    // Check heading hierarchy
    let previousLevel = 0;
    headings.forEach((heading) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = currentLevel;
    });
  });

  it('should have accessible form labels', () => {
    const { container } = render(<UserSettingsPage />);
    const inputs = container.querySelectorAll('input, select, textarea');

    inputs.forEach((input) => {
      const label = container.querySelector(`label[for="${input.id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      expect(
        label || ariaLabel || ariaLabelledBy
      ).toBeTruthy();
    });
  });
});
```

### 4. Lighthouse CI Configuration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Testing
on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Manual Testing Procedures

### Keyboard Navigation Testing

#### Test Checklist

- [ ] All interactive elements are reachable via Tab key
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps (except intentional ones)
- [ ] Escape key closes modals and dropdowns
- [ ] Enter and Space keys activate buttons
- [ ] Arrow keys work in menus and lists

#### Testing Steps

1. **Start with a fresh page load**
2. **Use only the keyboard** (disconnect mouse if necessary)
3. **Press Tab repeatedly** and verify:
   - Focus moves to each interactive element
   - Focus indicators are visible
   - Order makes logical sense
4. **Test specific interactions**:
   - Forms: Can you fill out and submit?
   - Menus: Can you navigate and select items?
   - Modals: Can you open, interact with, and close?

### Screen Reader Testing

#### NVDA Testing (Windows)

1. **Download and install NVDA** (free)
2. **Start NVDA** and turn off your monitor
3. **Navigate the site** using only audio feedback
4. **Test key functions**:
   - Page navigation (H key for headings)
   - Form completion
   - Link activation
   - Content reading

#### Testing Script Example

```
1. Load the course enrollment page
2. Use H key to navigate through headings
3. Verify page structure is announced correctly
4. Navigate to the enrollment form
5. Fill out form fields using Tab and arrow keys
6. Verify error messages are announced
7. Submit form and verify success message
```

### Visual Testing

#### Color Contrast Testing

1. **Use WebAIM Contrast Checker**
2. **Test all text/background combinations**
3. **Verify minimum ratios**:
   - Normal text: 4.5:1
   - Large text: 3:1
   - UI components: 3:1

#### Color Blindness Testing

1. **Use browser extensions** (Stark, Colorblinding)
2. **Test with different types**:
   - Protanopia (red-blind)
   - Deuteranopia (green-blind)
   - Tritanopia (blue-blind)
3. **Verify information isn't conveyed by color alone**

#### Zoom Testing

1. **Set browser zoom to 200%**
2. **Verify all content is still accessible**
3. **Check for horizontal scrolling**
4. **Test functionality at high zoom levels**

## User Testing with Disabled Users

### Recruiting Participants

- Partner with disability organizations
- Use accessibility-focused recruiting platforms
- Ensure diverse representation of disabilities
- Provide appropriate compensation

### Testing Session Structure

#### Pre-Session (15 minutes)

- Technical setup and assistive technology check
- Brief introduction to the platform
- Consent and recording permissions

#### Main Session (45 minutes)

- **Task 1**: Account creation and profile setup
- **Task 2**: Course browsing and enrollment
- **Task 3**: Lesson completion and progress tracking
- **Task 4**: Community forum participation
- **Task 5**: Certificate generation and download

#### Post-Session (15 minutes)

- Feedback discussion
- Accessibility feature suggestions
- Overall experience rating

### Sample Testing Tasks

#### Task 1: Account Creation

**Scenario**: "You're interested in learning about blockchain technology. Create an account on StrellerMinds."

**Success Criteria**:

- User can navigate to registration form
- All form fields are properly labeled
- Error messages are clear and actionable
- Account creation completes successfully

#### Task 2: Course Enrollment

**Scenario**: "Find and enroll in a beginner blockchain course."

**Success Criteria**:

- User can browse course catalog
- Course information is accessible
- Enrollment process is clear
- Confirmation is provided

### Data Collection

#### Quantitative Metrics

- Task completion rates
- Time to complete tasks
- Number of errors encountered
- Accessibility feature usage

#### Qualitative Feedback

- User satisfaction ratings
- Specific accessibility barriers
- Suggestions for improvement
- Preferred accessibility features

## Accessibility Testing Checklist

### Page-Level Testing

- [ ] Page has a descriptive title
- [ ] Page has proper heading structure (h1-h6)
- [ ] All images have appropriate alt text
- [ ] Links have descriptive text
- [ ] Page can be navigated with keyboard only
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Page works at 200% zoom
- [ ] No content flashes more than 3 times per second

### Form Testing

- [ ] All form controls have labels
- [ ] Required fields are clearly indicated
- [ ] Error messages are descriptive and helpful
- [ ] Form can be completed using keyboard only
- [ ] Form validation is accessible
- [ ] Success messages are announced to screen readers

### Interactive Element Testing

- [ ] Buttons have descriptive text or labels
- [ ] Custom controls have appropriate ARIA attributes
- [ ] Dropdown menus are keyboard accessible
- [ ] Modal dialogs trap focus appropriately
- [ ] Tooltips are accessible via keyboard
- [ ] Dynamic content changes are announced

### Media Testing

- [ ] Videos have captions
- [ ] Audio content has transcripts
- [ ] Auto-playing media can be paused
- [ ] Media controls are keyboard accessible
- [ ] Audio descriptions are available when needed

## Reporting and Documentation

### Accessibility Issue Template

```markdown
## Accessibility Issue Report

**Issue Type**: [Keyboard Navigation / Screen Reader / Visual / Other]
**Severity**: [Critical / High / Medium / Low]
**WCAG Guideline**: [e.g., 2.1.1 Keyboard]

### Description

Brief description of the accessibility barrier.

### Steps to Reproduce

1. Step one
2. Step two
3. Step three

### Expected Behavior

What should happen for accessibility compliance.

### Actual Behavior

What currently happens.

### Assistive Technology Used

- Screen reader: [NVDA / JAWS / VoiceOver / etc.]
- Browser: [Chrome / Firefox / Safari / etc.]
- Operating System: [Windows / macOS / etc.]

### Suggested Solution

Recommended approach to fix the issue.

### Screenshots/Videos

Attach relevant media if applicable.
```

### Testing Report Template

```markdown
## Accessibility Testing Report

**Date**: [Testing Date]
**Tester**: [Name and Role]
**Testing Method**: [Automated / Manual / User Testing]

### Summary

- Total issues found: X
- Critical issues: X
- High priority issues: X
- Medium priority issues: X
- Low priority issues: X

### Test Coverage

- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Zoom functionality
- [ ] Form accessibility
- [ ] Media accessibility

### Key Findings

1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Next Steps

- [ ] Fix critical issues
- [ ] Retest affected areas
- [ ] Update documentation
- [ ] Schedule follow-up testing
```

---

_This testing guide should be updated regularly as new accessibility standards emerge and testing tools evolve._
