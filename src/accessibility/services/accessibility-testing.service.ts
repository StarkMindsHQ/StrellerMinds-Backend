import { Injectable } from '@nestjs/common';

/**
 * WCAG violation severity levels
 */
export enum ViolationSeverity {
  CRITICAL = 'critical',
  SERIOUS = 'serious',
  MODERATE = 'moderate',
  MINOR = 'minor',
}

/**
 * Accessibility audit result
 */
export interface AccessibilityAuditResult {
  id: string;
  type: string;
  severity: ViolationSeverity;
  description: string;
  wcagCriteria: string;
  recommendation: string;
  element?: string;
  selector?: string;
}

export interface ComprehensiveAuditOptions {
  expectedLanguage?: string;
  css?: string;
}

/**
 * Service for testing and validating accessibility compliance
 */
@Injectable()
export class AccessibilityTestingService {
  /**
   * Validate WCAG 2.1 compliance for response content
   */
  validateWCAGCompliance(
    html: string,
    options?: ComprehensiveAuditOptions,
  ): AccessibilityAuditResult[] {
    const results: AccessibilityAuditResult[] = [];

    // Check 1: All images have alt text
    const imgRegex = /<img\s+(?:[^>]*?\s+)?src=["']/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html))) {
      if (!html.substring(imgMatch.index, imgMatch.index + 200).includes('alt=')) {
        results.push({
          id: 'img-alt-missing',
          type: 'Missing alt text',
          severity: ViolationSeverity.CRITICAL,
          description: 'Image missing alt attribute for accessibility',
          wcagCriteria: '1.1.1',
          recommendation: 'Add descriptive alt text to all images',
          selector: 'img',
        });
      }
    }

    // Check 2: Form labels are associated
    const inputRegex = /<input\s+(?:[^>]*?\s+)?(?:id|name)=["']([^"']+)["']/g;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(html))) {
      const inputId = inputMatch[1];
      if (!html.includes(`for="${inputId}"`)) {
        results.push({
          id: 'form-label-missing',
          type: 'Form control without label',
          severity: ViolationSeverity.SERIOUS,
          description: `Input element ${inputId} not associated with a label`,
          wcagCriteria: '1.3.1, 4.1.2',
          recommendation: 'Associate form controls with labels using <label for="">',
          selector: `input#${inputId}`,
        });
      }
    }

    // Check 3: Headings are properly nested
    const headingRegex = /<h([1-6])>/g;
    const headings: number[] = [];
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html))) {
      headings.push(parseInt(headingMatch[1]));
    }

    for (let i = 1; i < headings.length; i++) {
      const level = headings[i];
      const prevLevel = headings[i - 1];
      if (level - prevLevel > 1) {
        results.push({
          id: 'heading-hierarchy-invalid',
          type: 'Improper heading hierarchy',
          severity: ViolationSeverity.MODERATE,
          description: `Heading jumped from h${prevLevel} to h${level}`,
          wcagCriteria: '1.3.1',
          recommendation: 'Maintain proper heading hierarchy (h1 > h2 > h3, etc.)',
          selector: `h${level}`,
        });
      }
    }

    // Check 4: Links have descriptive text
    const linkRegex = /<a\s+[^>]*href=["'][^"']*["'][^>]*>([^<]*)<\/a>/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html))) {
      const linkText = linkMatch[1].trim();
      if (!linkText || linkText === 'click here' || linkText === 'read more') {
        results.push({
          id: 'link-text-not-descriptive',
          type: 'Non-descriptive link text',
          severity: ViolationSeverity.SERIOUS,
          description: `Link has non-descriptive text: "${linkText}"`,
          wcagCriteria: '2.4.4',
          recommendation: 'Use descriptive link text that explains the link purpose',
          selector: 'a',
        });
      }
    }

    // Check 5: Color contrast (simplified check)
    if (html.includes('style=') && html.includes('color')) {
      results.push({
        id: 'color-contrast-check-needed',
        type: 'Color contrast verification needed',
        severity: ViolationSeverity.MODERATE,
        description: 'Inline styles found - verify color contrast ratios',
        wcagCriteria: '1.4.3',
        recommendation: 'Ensure text/background color contrast ratio is at least 4.5:1',
      });
    }

    // Check 6: Language attribute on HTML
    if (!html.includes('lang=')) {
      results.push({
        id: 'language-not-declared',
        type: 'Page language not declared',
        severity: ViolationSeverity.MINOR,
        description: 'HTML element missing lang attribute',
        wcagCriteria: '3.1.1',
        recommendation: 'Add lang attribute to html element (e.g., <html lang="en">)',
        selector: 'html',
      });
    }

    if (
      options?.expectedLanguage &&
      !new RegExp(`lang=["']${options.expectedLanguage}`, 'i').test(html)
    ) {
      results.push({
        id: 'language-mismatch',
        type: 'Declared language mismatch',
        severity: ViolationSeverity.MODERATE,
        description: `Expected lang="${options.expectedLanguage}" but did not find matching html lang attribute`,
        wcagCriteria: '3.1.1',
        recommendation: `Set <html lang="${options.expectedLanguage}"> for localized pages`,
        selector: 'html',
      });
    }

    // Check 7: Ensure interactive elements are keyboard accessible
    const buttonRegex = /<button|<a href|<input type="button"/g;
    if (buttonRegex.test(html)) {
      // Check for onclick on non-interactive elements
      const onclickRegex = /<div[^>]*onclick|<span[^>]*onclick/g;
      if (onclickRegex.test(html)) {
        results.push({
          id: 'non-semantic-interactive',
          type: 'Non-semantic interactive element',
          severity: ViolationSeverity.SERIOUS,
          description: 'Found non-semantic elements (div, span) with onclick handlers',
          wcagCriteria: '2.1.1',
          recommendation: 'Use semantic HTML elements (button, a) for interactive elements',
          selector: 'div[onclick], span[onclick]',
        });
      }
    }

    // Check 8: Buttons/links have an accessible name
    const unlabeledButtonRegex =
      /<button(?![^>]*(aria-label|aria-labelledby))[^>]*>\s*(?:<\/button>|<\s*\/button>)/gi;
    if (unlabeledButtonRegex.test(html)) {
      results.push({
        id: 'button-name-missing',
        type: 'Interactive control without accessible name',
        severity: ViolationSeverity.SERIOUS,
        description: 'One or more buttons are missing visible text or ARIA label',
        wcagCriteria: '4.1.2',
        recommendation: 'Ensure every button has text, aria-label, or aria-labelledby',
        selector: 'button',
      });
    }

    // Check 9: Video captions
    const hasVideo = /<video[\s>]/i.test(html);
    const hasCaptions = /<track[^>]*kind=["']captions["']/i.test(html);
    if (hasVideo && !hasCaptions) {
      results.push({
        id: 'video-captions-missing',
        type: 'Video content without captions',
        severity: ViolationSeverity.SERIOUS,
        description: 'Video content appears to be missing captions track',
        wcagCriteria: '1.2.2',
        recommendation: 'Add <track kind="captions"> for prerecorded videos',
        selector: 'video',
      });
    }

    // Check 10: Focus styles
    const styleBlock = `${html} ${options?.css || ''}`;
    if (!/:focus|:focus-visible/.test(styleBlock)) {
      results.push({
        id: 'focus-visible-missing',
        type: 'Focus indicator styles missing',
        severity: ViolationSeverity.SERIOUS,
        description: 'No visible keyboard focus styles were detected',
        wcagCriteria: '2.4.7',
        recommendation: 'Define :focus or :focus-visible styles for interactive controls',
      });
    }

    return results;
  }

  /**
   * Check keyboard navigation support
   */
  validateKeyboardNavigation(
    html: string,
    options?: ComprehensiveAuditOptions,
  ): AccessibilityAuditResult[] {
    const results: AccessibilityAuditResult[] = [];

    // Check for tabindex attribute (good for accessibility if used correctly)
    const positiveTabindexRegex = /tabindex=["']([1-9]\d*)["']/g;
    if (positiveTabindexRegex.test(html)) {
      results.push({
        id: 'positive-tabindex-found',
        type: 'Positive tabindex value found',
        severity: ViolationSeverity.MODERATE,
        description: 'Positive tabindex values can break keyboard navigation',
        wcagCriteria: '2.4.3',
        recommendation: 'Use only tabindex="0" and tabindex="-1", rely on source order',
      });
    }

    // Check for accessible form implementation
    if (html.includes('<form')) {
      if (!html.includes('aria-label') && !html.includes('<legend')) {
        results.push({
          id: 'form-not-labeled',
          type: 'Form not properly labeled',
          severity: ViolationSeverity.SERIOUS,
          description: 'Form or fieldset lacks proper label',
          wcagCriteria: '1.3.1',
          recommendation: 'Use <fieldset> with <legend> or aria-label for forms',
          selector: 'form',
        });
      }
    }

    // Ensure skip links are available for keyboard users
    if (!/href=["']#main-content["']|skip to main/i.test(html)) {
      results.push({
        id: 'skip-link-missing',
        type: 'Skip link missing',
        severity: ViolationSeverity.MODERATE,
        description: 'No skip-to-main link detected',
        wcagCriteria: '2.4.1',
        recommendation: 'Add a visible-on-focus skip link to #main-content',
        selector: 'a[href="#main-content"]',
      });
    }

    // Avoid keyboard traps
    if (
      /tabindex=["']-1["']/.test(html) &&
      /onkeydown|onkeypress/.test(html) &&
      !/Escape|Esc/.test(html)
    ) {
      results.push({
        id: 'keyboard-trap-risk',
        type: 'Potential keyboard trap',
        severity: ViolationSeverity.SERIOUS,
        description:
          'Detected manual key handlers and programmatic focus without a visible escape route',
        wcagCriteria: '2.1.2',
        recommendation: 'Ensure focus can always leave components using Tab/Shift+Tab or Escape',
      });
    }

    return results;
  }

  /**
   * Validate screen reader compatibility
   */
  validateScreenReaderCompat(
    html: string,
    options?: ComprehensiveAuditOptions,
  ): AccessibilityAuditResult[] {
    const results: AccessibilityAuditResult[] = [];

    // Check for ARIA landmarks
    const landmarkRegex = /role=["'](main|navigation|complementary|contentinfo|region|search)["']/g;
    if (!landmarkRegex.test(html)) {
      results.push({
        id: 'aria-landmarks-missing',
        type: 'Missing ARIA landmarks',
        severity: ViolationSeverity.MODERATE,
        description: 'Page lacks semantic landmarks for screen reader navigation',
        wcagCriteria: '1.3.1',
        recommendation:
          'Add landmark roles (main, nav, complementary, contentinfo) to major sections',
      });
    }

    // Check for aria-live regions
    if (html.includes('dynamic') || html.includes('update')) {
      if (!html.includes('aria-live')) {
        results.push({
          id: 'dynamic-content-not-announced',
          type: 'Dynamic content not announced',
          severity: ViolationSeverity.SERIOUS,
          description: 'Dynamic content updates may not be announced to screen readers',
          wcagCriteria: '4.1.3',
          recommendation: 'Use aria-live="polite" or aria-live="assertive" for dynamic updates',
        });
      }
    }

    // Check for aria-hidden on decorative elements
    if (html.includes('aria-hidden=')) {
      results.push({
        id: 'aria-hidden-usage-detected',
        type: 'aria-hidden attribute used',
        severity: ViolationSeverity.MINOR,
        description: 'aria-hidden attributes found - verify they hide only decorative content',
        wcagCriteria: '1.3.1',
        recommendation: 'Ensure aria-hidden="true" is only used for decorative elements',
      });
    }

    // Check for skip links
    if (!html.includes('skip') && !html.includes('Skip to')) {
      results.push({
        id: 'skip-link-missing',
        type: 'Skip navigation link missing',
        severity: ViolationSeverity.MODERATE,
        description: 'Page lacks skip link for keyboard users',
        wcagCriteria: '2.4.1',
        recommendation: 'Add a skip link to allow users to jump directly to main content',
      });
    }

    // Detect icon-only controls without an accessible name
    const iconOnlyControlRegex =
      /<(button|a)(?![^>]*(aria-label|aria-labelledby))[^>]*>\s*(<svg|<i\b|<span[^>]*class=["'][^"']*icon)/gi;
    if (iconOnlyControlRegex.test(html)) {
      results.push({
        id: 'icon-control-name-missing',
        type: 'Icon-only control lacks accessible name',
        severity: ViolationSeverity.SERIOUS,
        description: 'Found icon-only control without aria-label/aria-labelledby',
        wcagCriteria: '4.1.2',
        recommendation: 'Add an accessible name to icon-only interactive controls',
      });
    }

    if (
      options?.expectedLanguage &&
      !new RegExp(`lang=["']${options.expectedLanguage}`, 'i').test(html)
    ) {
      results.push({
        id: 'screen-reader-lang-mismatch',
        type: 'Language metadata mismatch for screen readers',
        severity: ViolationSeverity.MODERATE,
        description:
          'Screen readers rely on correct page language to use the right pronunciation rules',
        wcagCriteria: '3.1.1',
        recommendation: `Set html lang="${options.expectedLanguage}"`,
        selector: 'html',
      });
    }

    return results;
  }

  /**
   * Run comprehensive accessibility audit
   */
  runComprehensiveAudit(html: string, options?: ComprehensiveAuditOptions) {
    const wcagCompliance = this.validateWCAGCompliance(html, options);
    const keyboardNavigation = this.validateKeyboardNavigation(html, options);
    const screenReaderCompatibility = this.validateScreenReaderCompat(html, options);
    const combined = [...wcagCompliance, ...keyboardNavigation, ...screenReaderCompatibility];

    const summary = {
      totalIssues: combined.length,
      criticalCount: combined.filter((r) => r.severity === ViolationSeverity.CRITICAL).length,
      seriousCount: combined.filter((r) => r.severity === ViolationSeverity.SERIOUS).length,
      moderateCount: combined.filter((r) => r.severity === ViolationSeverity.MODERATE).length,
      minorCount: combined.filter((r) => r.severity === ViolationSeverity.MINOR).length,
    };

    return {
      timestamp: new Date().toISOString(),
      wcagCompliance,
      keyboardNavigation,
      screenReaderCompatibility,
      summary,
    };
  }

  /**
   * Generate accessibility testing report
   */
  generateReport(auditResults: AccessibilityAuditResult[]) {
    const summary = {
      total: auditResults.length,
      critical: auditResults.filter((r) => r.severity === ViolationSeverity.CRITICAL).length,
      serious: auditResults.filter((r) => r.severity === ViolationSeverity.SERIOUS).length,
      moderate: auditResults.filter((r) => r.severity === ViolationSeverity.MODERATE).length,
      minor: auditResults.filter((r) => r.severity === ViolationSeverity.MINOR).length,
      pass: auditResults.length === 0,
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      results: auditResults.sort(
        (a, b) =>
          Object.values(ViolationSeverity).indexOf(b.severity) -
          Object.values(ViolationSeverity).indexOf(a.severity),
      ),
      recommendations: this.generateRecommendations(auditResults),
    };
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(auditResults: AccessibilityAuditResult[]): string[] {
    const recommendations = new Set<string>();

    for (const result of auditResults) {
      recommendations.add(result.recommendation);
    }

    return Array.from(recommendations);
  }

  /**
   * Check if content meets WCAG 2.1 AA standards
   */
  meetsWCAG21AA(auditResults: AccessibilityAuditResult[]): boolean {
    // No critical or serious issues should exist for AA compliance
    return !auditResults.some(
      (r) => r.severity === ViolationSeverity.CRITICAL || r.severity === ViolationSeverity.SERIOUS,
    );
  }
}
