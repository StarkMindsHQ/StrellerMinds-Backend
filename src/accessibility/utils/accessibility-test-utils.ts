import { Injectable } from '@nestjs/common';

/**
 * Service for testing accessibility compliance
 * Provides utilities for WCAG 2.1 AA validation
 */
@Injectable()
export class AccessibilityTestUtils {
  /**
   * Test keyboard navigation
   */
  testKeyboardNavigation(html: string): {
    hasSkipLinks: boolean;
    hasFocusManagement: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for skip links
    const hasSkipLinks = /skip\s+to|skip\s+link|skip\s+navigation/i.test(html);

    // Check for focus management
    const hasFocusManagement = /autofocus|tabindex=["']0["']|focus|:focus-visible/i.test(html);

    // Check for keyboard event handlers
    if (!/onkeydown|onkeyup|addEventListener.*key/i.test(html)) {
      issues.push('No keyboard event handlers found');
    }

    // Check for interactive elements
    const interactiveElements = html.match(/<button|<a\s+href|<input|<select|<textarea/gi);
    if (!interactiveElements || interactiveElements.length === 0) {
      issues.push('No interactive elements found');
    }

    return {
      hasSkipLinks,
      hasFocusManagement,
      issues,
    };
  }

  /**
   * Test screen reader compatibility
   */
  testScreenReaderCompat(html: string): {
    ariaLandmarks: number;
    ariaLabels: number;
    altText: number;
    semanticElements: number;
    issues: string[];
  } {
    const issues: string[] = [];

    // Count ARIA landmarks
    const ariaLandmarks = (
      html.match(/role=["'](main|nav|complementary|contentinfo|region|search)["']/gi) || []
    ).length;

    // Count ARIA labels
    const ariaLabels = (html.match(/aria-label|aria-labelledby|aria-describedby/gi) || []).length;

    // Count alt text
    const altText = (html.match(/alt=["'][^"']*["']/gi) || []).length;

    // Count semantic elements
    const semanticElements = (
      html.match(/<main|<nav|<header|<footer|<article|<section|<aside/gi) || []
    ).length;

    // Check for ARIA landmarks
    if (ariaLandmarks === 0 && semanticElements === 0) {
      issues.push('No landmarks (ARIA or semantic) found');
    }

    // Check for accessibility structure
    if (ariaLabels === 0 && altText === 0) {
      issues.push('No accessible labels or alt text found');
    }

    return {
      ariaLandmarks,
      ariaLabels,
      altText,
      semanticElements,
      issues,
    };
  }

  /**
   * Test color contrast
   */
  testColorContrast(
    foregroundColor: string,
    backgroundColor: string,
  ): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  } {
    const fgRGB = this.hexToRgb(foregroundColor);
    const bgRGB = this.hexToRgb(backgroundColor);

    const fgLuminance = this.getLuminance(fgRGB);
    const bgLuminance = this.getLuminance(bgRGB);

    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7,
    };
  }

  /**
   * Validate form accessibility
   */
  validateFormAccessibility(html: string): {
    inputs: number;
    labels: number;
    ariaDescriptions: number;
    errors: string[];
  } {
    const errors: string[] = [];

    // Count inputs
    const inputs = (html.match(/<input|<textarea|<select/gi) || []).length;

    // Count labels
    const labels = (html.match(/<label/gi) || []).length;

    // Count aria descriptions
    const ariaDescriptions = (html.match(/aria-describedby|aria-description/gi) || []).length;

    // Check for label-input associations
    if (inputs > 0 && labels === 0) {
      errors.push('Inputs found without associated labels');
    }

    // Check for error handling
    if (!html.match(/aria-invalid|error|validation/i)) {
      errors.push('No error handling or validation found');
    }

    return {
      inputs,
      labels,
      ariaDescriptions,
      errors,
    };
  }

  /**
   * Test image accessibility
   */
  testImageAccessibility(html: string): {
    totalImages: number;
    withAltText: number;
    withAriaLabel: number;
    issues: string[];
  } {
    const issues: string[] = [];

    // Find all images
    const imgRegex = /<img[^>]*>/gi;
    const images = html.match(imgRegex) || [];
    const totalImages = images.length;

    // Count images with alt text
    let withAltText = 0;
    let withAriaLabel = 0;

    for (const img of images) {
      if (/alt=["'][^"']*["']/i.test(img)) {
        withAltText++;
      }
      if (/aria-label=["'][^"']*["']/i.test(img)) {
        withAriaLabel++;
      }
    }

    // Check for decorative images
    const decorativeImages = html.match(/alt=["']\s*["']/gi) || [];
    if (decorativeImages.length > 0) {
      issues.push(`Found ${decorativeImages.length} decorative images (empty alt text)`);
    }

    // Check for missing alt text
    const missingAlt = totalImages - withAltText;
    if (missingAlt > 0) {
      issues.push(`${missingAlt} images missing alt text`);
    }

    return {
      totalImages,
      withAltText,
      withAriaLabel,
      issues,
    };
  }

  /**
   * Test heading structure
   */
  testHeadingStructure(html: string): {
    headings: Array<{ level: number; text: string }>;
    issues: string[];
  } {
    const issues: string[] = [];
    const headings: Array<{ level: number; text: string }> = [];

    // Extract headings
    const headingRegex = /<h([1-6])>([^<]*)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].trim();
      headings.push({ level, text });
    }

    // Check for proper nesting
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;

      if (currentLevel - previousLevel > 1) {
        issues.push(`Heading hierarchy broken: h${previousLevel} followed by h${currentLevel}`);
      }
    }

    // Check for h1
    if (headings.length === 0 || headings[0].level !== 1) {
      issues.push('Page should start with an h1 heading');
    }

    return {
      headings,
      issues,
    };
  }

  /**
   * Test focus visibility
   */
  testFocusVisibility(css: string): {
    hasFocusStyles: boolean;
    focusSelectors: string[];
    issues: string[];
  } {
    const issues: string[] = [];
    const focusSelectors: string[] = [];

    // Check for focus styles
    const focusRegex = /:focus|:focus-visible|:focus-within/g;
    const matches = css.match(focusRegex);

    const hasFocusStyles = matches !== null && matches.length > 0;

    if (!hasFocusStyles) {
      issues.push('No :focus styles found in CSS');
    }

    // Check for outline-none without replacement
    if (css.includes('outline: none') || css.includes('outline:none')) {
      issues.push('outline: none found - ensure replacement focus styles exist');
    }

    return {
      hasFocusStyles,
      focusSelectors,
      issues,
    };
  }

  /**
   * Generate comprehensive accessibility report
   */
  generateReport(html: string, css?: string) {
    const keyboardNav = this.testKeyboardNavigation(html);
    const screenReader = this.testScreenReaderCompat(html);
    const formAccess = this.validateFormAccessibility(html);
    const images = this.testImageAccessibility(html);
    const headings = this.testHeadingStructure(html);
    const focusVis = css ? this.testFocusVisibility(css) : null;

    const allIssues = [
      ...keyboardNav.issues,
      ...screenReader.issues,
      ...formAccess.errors,
      ...images.issues,
      ...headings.issues,
      ...(focusVis?.issues || []),
    ];

    return {
      summary: {
        totalIssues: allIssues.length,
        wcagCompliant: allIssues.length === 0,
        score:
          Math.round(
            ((100 * (keyboardNav.issues.length === 0 ? 1 : 0) +
              (screenReader.issues.length === 0 ? 1 : 0) +
              (formAccess.errors.length === 0 ? 1 : 0) +
              (images.issues.length === 0 ? 1 : 0) +
              (headings.issues.length === 0 ? 1 : 0) +
              (focusVis?.issues.length === 0 ? 1 : 0)) /
              6) *
              100,
          ) / 100,
      },
      details: {
        keyboardNavigation: keyboardNav,
        screenReader,
        formAccessibility: formAccess,
        images,
        headings,
        focus: focusVis,
      },
      issues: allIssues,
      recommendations: this.generateRecommendations(allIssues),
    };
  }

  private generateRecommendations(issues: string[]): string[] {
    const recommendations = new Set<string>();

    for (const issue of issues) {
      if (issue.includes('skip')) {
        recommendations.add('Add skip links for keyboard navigation');
      } else if (issue.includes('label')) {
        recommendations.add('Ensure all form inputs have associated labels');
      } else if (issue.includes('alt')) {
        recommendations.add('Add descriptive alt text to all images');
      } else if (issue.includes('heading')) {
        recommendations.add('Maintain proper heading hierarchy (h1 > h2 > h3)');
      } else if (issue.includes('focus')) {
        recommendations.add('Add visible focus styles to all interactive elements');
      } else if (issue.includes('landmark')) {
        recommendations.add('Add ARIA landmarks or semantic HTML for page structure');
      }
    }

    return Array.from(recommendations);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}
