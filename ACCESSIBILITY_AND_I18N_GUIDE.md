# Accessibility & Internationalization Implementation Guide

## Overview

This document describes the comprehensive accessibility and internationalization (i18n) system implemented in the StrellerMinds Backend. The system ensures WCAG 2.1 AA compliance and supports 15+ languages including RTL language support.

## Table of Contents

1. [Internationalization (i18n)](#internationalization)
2. [Accessibility Features](#accessibility-features)
3. [RTL Language Support](#rtl-language-support)
4. [Testing & Compliance](#testing--compliance)
5. [API Endpoints](#api-endpoints)
6. [Implementation Examples](#implementation-examples)

---

## Internationalization

### Supported Languages (15+)

The system supports the following languages:

- **English** (en) - English, US
- **Spanish** (es) - Español, ES
- **French** (fr) - Français, FR
- **German** (de) - Deutsch, DE
- **Italian** (it) - Italiano, IT
- **Portuguese** (pt) - Português, PT
- **Russian** (ru) - Русский, RU
- **Japanese** (ja) - 日本語, JP
- **Chinese** (zh) - 中文, CN
- **Korean** (ko) - 한국어, KR
- **Arabic** (ar) - العربية, SA - **RTL**
- **Hindi** (hi) - हिन्दी, IN
- **Thai** (th) - ไทย, TH
- **Vietnamese** (vi) - Tiếng Việt, VN
- **Turkish** (tr) - Türkçe, TR

### I18n Service

The `I18nService` manages all translation functionality:

```typescript
// Inject the service
constructor(private readonly i18nService: I18nService) {}

// Translate a single key
const text = this.i18nService.translate('common.welcome', 'en');

// Translate with parameters
const text = this.i18nService.translate('errors.passwordTooShort', 'es', {});

// Get multiple translations
const translations = this.i18nService.translateMultiple(
  ['common.welcome', 'common.goodbye'],
  'fr'
);

// Detect language from header
const language = this.i18nService.detectLanguageFromHeader('en-US,en;q=0.9,fr;q=0.8');

// Check if language is RTL
const isRTL = this.i18nService.isRTL('ar'); // true

// Get language metadata
const metadata = this.i18nService.getLanguageMetadata('ja');
```

### Language Detection

The `LanguageDetectionMiddleware` automatically detects and sets the user's language based on:

1. **URL query parameter**: `?lang=en`
2. **Language cookie**: Previously set language preference
3. **Accept-Language header**: Browser/client preference
4. **Default**: Falls back to English

The detected language is available on the request object:

```typescript
@Get('profile')
getProfile(@Req() req) {
  const language = req['language']; // Detected language
  const isRTL = req['isRTL']; // RTL flag
  const locale = req['locale']; // Full locale string (e.g., 'ar-SA')
}
```

### Translation File Structure

Each language has a JSON translation file at `src/i18n/translations/{lang}.json`:

```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye"
  },
  "auth": {
    "login": "Login",
    "password": "Password"
  },
  "errors": {
    "required": "This field is required"
  }
}
```

### I18n API Endpoints

- **GET** `/i18n/languages` - Get all supported languages
- **GET** `/i18n/translations?lang=en&keys=common.welcome,auth.login` - Get translations
- **GET** `/i18n/detect` - Detect language from Accept-Language header
- **GET** `/i18n/translate?key=common.welcome&lang=es` - Translate a single key

---

## Accessibility Features

### WCAG 2.1 AA Compliance

The system implements comprehensive WCAG 2.1 AA compliance including:

#### 1. **Perceivable**
- Non-text content has text alternatives (alt text)
- Color contrast ratio of at least 4.5:1 for normal text
- Flexible text sizing

#### 2. **Operable**
- All functionality available from keyboard
- No keyboard traps
- Logical focus order
- Skip links for keyboard navigation

#### 3. **Understandable**
- Language of page is identified
- Clear error identification
- Error prevention for critical transactions

#### 4. **Robust**
- Name, role, and value of components are available
- Status messages conveyed to assistive technologies

### Accessibility Service

The `AccessibilityService` provides utilities for building accessible components:

```typescript
// Build ARIA attributes
const ariaAttrs = this.accessibilityService.buildAriaAttributes({
  role: AriaRole.BUTTON,
  label: 'Close dialog',
  ariaPressed: false,
  ariaExpanded: false,
});

// Create keyboard navigation handler
const handler = this.accessibilityService.createKeyboardNavigationHandler({
  onEscape: () => this.closeDialog(),
  onEnter: () => this.submitForm(),
  onArrowUp: () => this.selectPrevious(),
  onArrowDown: () => this.selectNext(),
});

// Check color contrast
const contrast = this.accessibilityService.checkContrastRatio('#000000', '#FFFFFF');
console.log(contrast.meetsAA); // true

// Get skip navigation links
const skipLinks = this.accessibilityService.getSkipNavigationLinks();

// Get WCAG checklist
const checklist = this.accessibilityService.getWCAGComplianceChecklist();
```

### Accessibility Decorators

Use decorators to mark accessible components:

```typescript
import {
  AccessibleName,
  ScreenReaderOptimized,
  KeyboardNavigable,
  WCAGCompliance,
} from './accessibility/decorators/accessibility.decorators';

@Controller('users')
@ScreenReaderOptimized()
@WCAGCompliance('AA')
export class UserController {
  @Get('profile')
  @KeyboardNavigable('#user-profile')
  @AccessibleName('User Profile')
  getProfile() {
    // Implementation
  }
}
```

### Screen Reader Support

The system is fully optimized for screen readers:

- **ARIA Landmarks**: All major sections use semantic HTML or ARIA landmarks
- **Live Regions**: Dynamic content uses `aria-live` regions
- **Form Labels**: All inputs have associated labels
- **Error Messages**: Errors are properly announced
- **Skip Links**: Users can skip navigation

Example ARIA implementation:

```typescript
buildAriaAttributes({
  role: AriaRole.ALERT,
  ariaLive: AriaPoliteness.ASSERTIVE,
  ariaAtomic: true,
  label: 'Error message: Password too short',
})
```

### Keyboard Navigation

Full keyboard navigation support with proper focus management:

```typescript
const keyboardHandler = this.accessibilityService.createKeyboardNavigationHandler({
  onEscape: () => this.closeModal(),
  onEnter: () => this.submitForm(),
  onTab: () => this.moveFocus(),
  onArrowUp: () => this.selectPreviousItem(),
  onArrowDown: () => this.selectNextItem(),
  onHome: () => this.selectFirstItem(),
  onEnd: () => this.selectLastItem(),
});

document.addEventListener('keydown', keyboardHandler);
```

---

## RTL Language Support

### RTL Service

The `RTLService` handles all right-to-left language requirements:

```typescript
// Check if language is RTL
if (this.rtlService.isRTL('ar')) {
  // Apply RTL styles
}

// Get text direction
const direction = this.rtlService.getDirection('ar'); // 'rtl'

// Get HTML attributes
const attrs = this.rtlService.getHtmlAttributes('ar');
// { lang: 'ar', dir: 'rtl' }

// Flip spacing based on direction
const spacing = this.rtlService.flipSpacing('ar', {
  left: 16,
  right: 8,
  top: 4,
  bottom: 4,
});
// { left: 8, right: 16, top: 4, bottom: 4 }

// Format numbers in language locale
const formatted = this.rtlService.formatNumber('ar', 1234.56); // '١٬٢٣٤٫٥٦'

// Format dates
const date = this.rtlService.formatDate('ar', new Date());

// Format currency
const price = this.rtlService.formatCurrency('ar', 99.99, 'SAR');

// Format lists
const list = this.rtlService.formatList('ar', ['item1', 'item2', 'item3']);
```

### Supported RTL Languages

- **Arabic** (ar)
- **Hebrew** (he)
- **Persian/Farsi** (fa)
- **Urdu** (ur)

### RTL Implementation Guidelines

1. **Use logical CSS properties** when possible:
   - `margin-inline-start` instead of `margin-left`
   - `padding-inline-end` instead of `padding-right`
   - `text-align: start` instead of `text-align: left`

2. **Use the RTL service for positioning**:
   ```typescript
   const position = this.rtlService.getPosition('ar', {
     left: '16px',
     right: undefined,
   });
   ```

3. **Set HTML dir attribute**:
   ```typescript
   const attrs = this.rtlService.getHtmlAttributes('ar');
   // Returns: { lang: 'ar', dir: 'rtl', ... }
   ```

---

## Testing & Compliance

### Accessibility Testing Service

The `AccessibilityTestingService` provides comprehensive testing utilities:

```typescript
// Run comprehensive audit
const audit = this.testingService.runComprehensiveAudit(html);

// Validate WCAG compliance
const results = this.testingService.validateWCAGCompliance(html);

// Validate keyboard navigation
const keyboardResults = this.testingService.validateKeyboardNavigation(html);

// Validate screen reader compatibility
const screenReaderResults = this.testingService.validateScreenReaderCompat(html);

// Check WCAG 2.1 AA compliance
const isCompliant = this.testingService.meetsWCAG21AA(results);

// Generate report
const report = this.testingService.generateReport(results);
```

### Test Utils

The `AccessibilityTestUtils` provides detailed testing:

```typescript
// Test keyboard navigation
const keyboardTest = this.testUtils.testKeyboardNavigation(html);

// Test screen reader compatibility
const srTest = this.testUtils.testScreenReaderCompat(html);

// Test color contrast
const contrast = this.testUtils.testColorContrast('#000000', '#FFFFFF');

// Validate form accessibility
const formTest = this.testUtils.validateFormAccessibility(html);

// Test image accessibility
const imageTest = this.testUtils.testImageAccessibility(html);

// Test heading structure
const headingTest = this.testUtils.testHeadingStructure(html);

// Generate comprehensive report
const report = this.testUtils.generateReport(html, css);
```

### Audit Endpoints

- **POST** `/accessibility/audit` - Run accessibility audit on HTML
- **GET** `/accessibility/wcag-checklist` - Get WCAG 2.1 AA checklist
- **POST** `/accessibility/screen-reader-text` - Generate screen reader text
- **GET** `/accessibility/contrast?foreground=#000&background=#FFF` - Check contrast ratio

---

## API Endpoints

### I18n Endpoints

```
GET /i18n/languages
GET /i18n/translations?lang=en&keys=common.welcome
GET /i18n/detect
GET /i18n/translate?key=common.welcome&lang=es
```

### Accessibility Endpoints

```
GET /accessibility/wcag-checklist
POST /accessibility/build-aria
POST /accessibility/screen-reader-text
GET /accessibility/contrast?foreground=#000&background=#FFF
GET /accessibility/skip-links
POST /accessibility/audit
GET /accessibility/overview
```

---

## Implementation Examples

### Example 1: Multilingual Form Validation

```typescript
@Post('register')
async register(@Body() dto: RegisterDto, @Req() req) {
  const language = req['language'];
  const isRTL = req['isRTL'];

  // Validate with localized error messages
  if (!dto.email) {
    const errorMsg = this.i18nService.translate(
      'errors.required',
      language,
    );
    throw new BadRequestException(errorMsg);
  }

  // Build ARIA attributes for form
  const ariaAttrs = this.accessibilityService.buildAriaAttributes({
    role: AriaRole.FORM,
    labelledBy: 'form-title',
  });

  return {
    success: true,
    direction: this.rtlService.getDirection(language),
    ariaAttributes: ariaAttrs,
  };
}
```

### Example 2: Accessible Button Component

```typescript
buildAccessibleButton(label: string, language: string) {
  const ariaAttrs = this.accessibilityService.buildAriaAttributes({
    role: AriaRole.BUTTON,
    label: this.i18nService.translate(label, language),
    ariaDisabled: false,
  });

  const textAlign = this.rtlService.getTextAlign(language);

  return {
    ariaAttributes: ariaAttrs,
    textAlign,
    direction: this.rtlService.getDirection(language),
  };
}
```

### Example 3: Accessibility Audit

```typescript
@Post('audit-content')
async auditContent(@Body() body: { html: string }) {
  const report = this.testingService.generateReport(
    this.testingService.runComprehensiveAudit(body.html),
  );

  return {
    compliant: report.wcagCompliance.meets,
    issues: report.summary,
    recommendations: report.recommendations,
  };
}
```

### Example 4: Language Switching

```typescript
@Post('set-language')
setLanguage(@Body() body: { language: string }, @Res() res: Response) {
  const normalizedLang = this.i18nService.normalizeLanguageCode(body.language);

  // Set language cookie
  res.cookie('language', normalizedLang, {
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  // Get metadata
  const metadata = this.i18nService.getLanguageMetadata(normalizedLang);
  const isRTL = this.rtlService.isRTL(normalizedLang);

  return {
    language: normalizedLang,
    metadata,
    isRTL,
  };
}
```

---

## Best Practices

### For Frontend Integration

1. **Always include lang and dir attributes**:
   ```html
   <html lang="{{ language }}" dir="{{ direction }}">
   ```

2. **Use semantic HTML elements**:
   ```html
   <nav role="navigation">
   <main id="main-content">
   <button aria-label="{{ aria-label }}">
   ```

3. **Provide skip links**:
   ```html
   <a href="#main-content" class="skip-link">Skip to main content</a>
   ```

4. **Test with screen readers**: NVDA (Windows), JAWS, VoiceOver (macOS)

### For API Implementation

1. **Include language in all responses**:
   ```typescript
   return {
     data: {...},
     language: req['language'],
     direction: this.rtlService.getDirection(req['language']),
   };
   ```

2. **Use accessibility decorators**:
   ```typescript
   @ScreenReaderOptimized()
   @WCAGCompliance('AA')
   @KeyboardNavigable()
   ```

3. **Provide ARIA attributes**:
   ```typescript
   const ariaAttrs = this.accessibilityService.buildAriaAttributes({
     role: AriaRole.DIALOG,
     label: 'Confirmation',
   });
   ```

4. **Support language detection**:
   ```typescript
   const language = this.i18nService.detectLanguageFromHeader(
     req.headers['accept-language'],
   );
   ```

---

## Compliance Verification

### WCAG 2.1 AA Checklist

- ✅ Non-text content has alt text (1.1.1)
- ✅ Color contrast ≥ 4.5:1 (1.4.3)
- ✅ All functionality available via keyboard (2.1.1)
- ✅ No keyboard traps (2.1.2)
- ✅ Focus order is logical (2.4.3)
- ✅ Language identified (3.1.1)
- ✅ Error identification (3.3.1)
- ✅ Name, role, value available (4.1.2)
- ✅ Status messages conveyed (4.1.3)

### Testing Tools

Recommended testing tools:
- **Automated**: axe DevTools, WAVE, Lighthouse
- **Manual**: Screen readers (NVDA, JAWS, VoiceOver)
- **Keyboard**: Keyboard-only navigation
- **Automated reporting**: Our `/accessibility/audit` endpoint

---

## Troubleshooting

### Language Not Detected Correctly

1. Check the Accept-Language header is being sent
2. Verify the language code format (should be ISO 639-1)
3. Check if language is in the supported languages list
4. Fallback defaults to English

### RTL Layout Breaking

1. Ensure `dir="rtl"` is set on the root element
2. Check for hardcoded `left`/`right` CSS - use logical properties instead
3. Use `text-align: start` instead of `text-align: left`
4. Verify with `this.rtlService.isRTL(language)`

### Screen Reader Not Announcing Content

1. Ensure ARIA labels are set: `aria-label` or `aria-labelledby`
2. Check for `aria-hidden="true"` hiding important content
3. Use `aria-live` for dynamic content
4. Verify semantic HTML structure

---

## Future Enhancements

- [ ] Translation management UI
- [ ] Automatic language detection by geographic location
- [ ] Regional locale variations (e.g., en-GB, en-US)
- [ ] Pluralization rules for different languages
- [ ] Custom keyboard shortcuts per language
- [ ] Accessibility audit scheduling
- [ ] Integration with external accessibility services
- [ ] User preference storage in database
- [ ] Font size customization per language

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Rich Internet Applications (ARIA)](https://www.w3.org/TR/wai-aria-1.2/)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
