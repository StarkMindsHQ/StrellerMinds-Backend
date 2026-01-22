import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccessibilityService, AriaRole, AriaPoliteness } from '../services/accessibility.service';
import {
  AccessibilityTestingService,
  ViolationSeverity,
} from '../services/accessibility-testing.service';

@Controller('accessibility')
export class AccessibilityController {
  constructor(
    private readonly accessibilityService: AccessibilityService,
    private readonly testingService: AccessibilityTestingService,
  ) {}

  /**
   * Get WCAG 2.1 AA compliance checklist
   */
  @Get('wcag-checklist')
  getWCAGChecklist() {
    return this.accessibilityService.getWCAGComplianceChecklist();
  }

  /**
   * Build ARIA attributes
   */
  @Post('build-aria')
  buildAriaAttributes(
    @Body()
    options: {
      role?: AriaRole;
      label?: string;
      labelledBy?: string;
      describedBy?: string;
      [key: string]: any;
    },
  ) {
    return {
      attributes: this.accessibilityService.buildAriaAttributes(options),
    };
  }

  /**
   * Generate screen reader friendly text
   */
  @Post('screen-reader-text')
  generateScreenReaderText(
    @Body()
    options: {
      action?: string;
      state?: string;
      count?: number;
      total?: number;
      error?: string;
      hint?: string;
    },
  ) {
    return {
      text: this.accessibilityService.generateScreenReaderText(options),
    };
  }

  /**
   * Check color contrast ratio
   */
  @Get('contrast')
  checkContrastRatio(
    @Query('foreground') foreground: string,
    @Query('background') background: string,
  ) {
    if (!foreground || !background) {
      return { error: 'foreground and background colors required' };
    }

    return this.accessibilityService.checkContrastRatio(foreground, background);
  }

  /**
   * Get skip navigation links
   */
  @Get('skip-links')
  getSkipLinks() {
    return {
      skipLinks: this.accessibilityService.getSkipNavigationLinks(),
    };
  }

  /**
   * Audit HTML content for accessibility
   */
  @Post('audit')
  auditContent(@Body() body: { html: string }) {
    if (!body.html) {
      return { error: 'HTML content required' };
    }

    const auditResult = this.testingService.runComprehensiveAudit(body.html);
    const allResults = [
      ...auditResult.wcagCompliance,
      ...auditResult.keyboardNavigation,
      ...auditResult.screenReaderCompatibility,
    ];

    const report = this.testingService.generateReport(allResults);
    const meetsWCAG = this.testingService.meetsWCAG21AA(allResults);

    return {
      ...report,
      wcagCompliance: {
        level: 'AA',
        meets: meetsWCAG,
      },
      categories: {
        wcag: auditResult.wcagCompliance,
        keyboard: auditResult.keyboardNavigation,
        screenReader: auditResult.screenReaderCompatibility,
      },
    };
  }

  /**
   * Get accessibility features overview
   */
  @Get('overview')
  getOverview() {
    return {
      features: {
        wcagCompliance: 'WCAG 2.1 AA compliance validation',
        ariaSupport: 'Comprehensive ARIA attribute builder',
        keyboardNavigation: 'Full keyboard accessibility support',
        screenReader: 'Screen reader compatibility testing',
        contrastCheck: 'Color contrast ratio validation',
        skipLinks: 'Skip navigation link support',
        languageSupport: '15+ languages supported',
        rtlSupport: 'RTL language support (Arabic, Hebrew, Persian, Urdu)',
        focusManagement: 'Focus trap management and keyboard shortcuts',
      },
      keyboardShortcuts: {
        escape: 'Close modals or cancel operations',
        tab: 'Navigate to next focusable element',
        shiftTab: 'Navigate to previous focusable element',
        enter: 'Activate buttons or submit forms',
        space: 'Toggle checkboxes or expand/collapse',
        arrowKeys: 'Navigate within menus or lists',
        home: 'Jump to first item',
        end: 'Jump to last item',
      },
      bestPractices: [
        'Always provide descriptive alt text for images',
        'Use semantic HTML elements',
        'Ensure keyboard navigation works',
        'Maintain color contrast ratios',
        'Test with screen readers',
        'Provide skip links',
        'Use ARIA labels appropriately',
        'Ensure proper heading hierarchy',
      ],
    };
  }
}
