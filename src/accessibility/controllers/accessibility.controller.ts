import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AccessibilityService, AriaRole, AriaPoliteness } from '../services/accessibility.service';
import {
  AccessibilityTestingService,
  ViolationSeverity,
} from '../services/accessibility-testing.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';

@ApiTags('Accessibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accessibility')
export class AccessibilityController {
  constructor(
    private readonly accessibilityService: AccessibilityService,
    private readonly testingService: AccessibilityTestingService,
    private readonly monitoringService: AccessibilityMonitoringService,
    private readonly rtlService: RTLService,
    private readonly i18nService: I18nService,
  ) {}

  @Get('wcag-checklist')
  @ApiOperation({ summary: 'Get WCAG 2.1 AA compliance checklist', description: 'Returns a comprehensive checklist for WCAG 2.1 AA accessibility guidelines.' })
  @ApiResponse({ status: 200, description: 'Checklist retrieved successfully.' })
  getWCAGChecklist() {
    return this.accessibilityService.getWCAGComplianceChecklist();
  }

  @Post('build-aria')
  @ApiOperation({ summary: 'Build ARIA attributes', description: 'Generates valid ARIA attributes based on provided roles and labels.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: Object.values(AriaRole), example: 'button' },
        label: { type: 'string', example: 'Close menu' },
        labelledBy: { type: 'string', example: 'modal-title' },
        describedBy: { type: 'string', example: 'modal-desc' },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'ARIA attributes built successfully.' })
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

  @Post('screen-reader-text')
  @ApiOperation({ summary: 'Generate screen reader friendly text', description: 'Transforms raw data into descriptive strings optimized for screen readers.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', example: 'loading' },
        state: { type: 'string', example: 'in progress' },
        count: { type: 'number', example: 5 },
        total: { type: 'number', example: 10 },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Screen reader text generated successfully.' })
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

  @Get('contrast')
  @ApiOperation({ summary: 'Check color contrast ratio', description: 'Validates if the foreground and background colors meet WCAG contrast requirements.' })
  @ApiQuery({ name: 'foreground', example: '#FFFFFF' })
  @ApiQuery({ name: 'background', example: '#000000' })
  @ApiResponse({ status: 200, description: 'Contrast ratio checked and validated.' })
  checkContrastRatio(
    @Query('foreground') foreground: string,
    @Query('background') background: string,
  ) {
    if (!foreground || !background) {
      return { error: 'foreground and background colors required' };
    }

    return this.accessibilityService.checkContrastRatio(foreground, background);
  }

  @Get('skip-links')
  @ApiOperation({ summary: 'Get skip navigation links', description: 'Returns a list of standardized skip links for keyboard navigation.' })
  @ApiResponse({ status: 200, description: 'Skip links retrieved successfully.' })
  getSkipLinks() {
    return {
      skipLinks: this.accessibilityService.getSkipNavigationLinks(),
    };
  }

  @Post('audit')
  @ApiOperation({ summary: 'Audit HTML content for accessibility', description: 'Performs a comprehensive accessibility audit (WCAG, Keyboard, Screen Reader) on provided HTML.' })
  @ApiBody({ schema: { properties: { html: { type: 'string', example: '<div><img src="foo.jpg"></div>' } } } })
  @ApiResponse({ status: 200, description: 'Audit completed successfully with detailed report.' })
  auditContent(@Body() body: { html: string }) {
    if (!body.html) {
      return { error: 'HTML content required' };
    }

    const language = this.i18nService.normalizeLanguageCode(dto.language || req?.language || 'en');
    const auditResult = this.testingService.runComprehensiveAudit(dto.html, {
      expectedLanguage: language,
      css: dto.css,
    });
    const allResults = [
      ...auditResult.wcagCompliance,
      ...auditResult.keyboardNavigation,
      ...auditResult.screenReaderCompatibility,
    ];

    const report = this.testingService.generateReport(allResults);
    const meetsWCAG = this.testingService.meetsWCAG21AA(allResults);

    // Save audit to database
    const savedAudit = await this.monitoringService.saveAudit(
      dto.url,
      allResults,
      req?.user?.id,
      dto.type,
    );

    return {
      ...report,
      auditId: savedAudit.id,
      wcagCompliance: {
        level: 'AA',
        meets: meetsWCAG,
      },
      categories: {
        wcag: auditResult.wcagCompliance,
        keyboard: auditResult.keyboardNavigation,
        screenReader: auditResult.screenReaderCompatibility,
      },
      i18n: {
        language,
        rtl: this.rtlService.isRTL(language),
        direction: this.rtlService.getDirection(language),
      },
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get accessibility features overview', description: 'Returns a high-level overview of available accessibility features and best practices.' })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully.' })
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
        localizationAwareness: 'Language-specific accessibility and RTL-aware auditing',
      },
      keyboardSystem: this.accessibilityService.getKeyboardShortcuts(),
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

  @Get('keyboard-shortcuts')
  getKeyboardShortcuts() {
    return {
      shortcuts: this.accessibilityService.getKeyboardShortcuts(),
    };
  }

  @Get('language-support')
  getLanguageSupport(@Query('lang') language: string = 'en') {
    const normalized = this.i18nService.normalizeLanguageCode(language);
    return {
      language: normalized,
      metadata: this.i18nService.getLanguageMetadata(normalized),
      direction: this.rtlService.getDirection(normalized),
      htmlAttributes: this.rtlService.getFullHTMLAttributes(normalized),
    };
  }
}
