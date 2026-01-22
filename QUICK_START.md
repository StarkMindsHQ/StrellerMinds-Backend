# Quick Start Guide - Accessibility & Internationalization

## Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the project
npm run build

# Start in development mode
npm run start:dev
```

## Testing the Features

### Test Internationalization

```bash
# Get all supported languages
curl http://localhost:3000/i18n/languages

# Detect language from Accept-Language header
curl -H "Accept-Language: es-ES,es;q=0.9" http://localhost:3000/i18n/detect

# Translate a key
curl "http://localhost:3000/i18n/translate?key=common.welcome&lang=fr"

# Get multiple translations
curl "http://localhost:3000/i18n/translations?lang=de&keys=common.welcome,auth.login"
```

### Test Accessibility

```bash
# Get WCAG 2.1 AA compliance checklist
curl http://localhost:3000/accessibility/wcag-checklist

# Check color contrast
curl "http://localhost:3000/accessibility/contrast?foreground=%23000000&background=%23FFFFFF"

# Get skip links
curl http://localhost:3000/accessibility/skip-links

# Get accessibility overview
curl http://localhost:3000/accessibility/overview

# Audit HTML for accessibility
curl -X POST http://localhost:3000/accessibility/audit \
  -H "Content-Type: application/json" \
  -d '{"html": "<img src=\"test.jpg\"><button>Click me</button>"}'
```

## Usage in Controllers

### Using the I18n Service

```typescript
import { I18nService } from './i18n/services/i18n.service';

@Controller('users')
export class UserController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('welcome')
  getWelcome(@Req() req) {
    const text = this.i18nService.translate('common.welcome', req['language']);
    return { message: text };
  }
}
```

### Using the Accessibility Service

```typescript
import { AccessibilityService } from './accessibility/services/accessibility.service';
import { AriaRole } from './accessibility/services/accessibility.service';

@Controller('forms')
export class FormController {
  constructor(private readonly accessibilityService: AccessibilityService) {}

  @Post('validate')
  validateForm(@Body() data: any) {
    const ariaAttrs = this.accessibilityService.buildAriaAttributes({
      role: AriaRole.FORM,
      label: 'User Registration Form',
    });
    
    return { ariaAttributes: ariaAttrs };
  }
}
```

### Using the RTL Service

```typescript
import { RTLService } from './accessibility/services/rtl.service';

@Controller('content')
export class ContentController {
  constructor(private readonly rtlService: RTLService) {}

  @Get('info/:language')
  getContent(@Param('language') language: string) {
    const isRTL = this.rtlService.isRTL(language);
    const direction = this.rtlService.getDirection(language);
    const attrs = this.rtlService.getHtmlAttributes(language);
    
    return { isRTL, direction, htmlAttributes: attrs };
  }
}
```

## Supported Languages (15+)

```
en  - English (US)
es  - Spanish (Spain)
fr  - French (France)
de  - German (Germany)
it  - Italian (Italy)
pt  - Portuguese (Portugal)
ru  - Russian (Russia)
ja  - Japanese (Japan)
zh  - Chinese (China)
ko  - Korean (Korea)
ar  - Arabic (Saudi Arabia) [RTL]
hi  - Hindi (India)
th  - Thai (Thailand)
vi  - Vietnamese (Vietnam)
tr  - Turkish (Turkey)
```

## Language Detection Priority

1. **URL Parameter**: `?lang=es` 
2. **Cookie**: Previously set language
3. **Accept-Language Header**: Browser preference
4. **Default**: English (en)

## WCAG 2.1 AA Compliance Features

✅ ARIA Attributes & Roles
✅ Keyboard Navigation
✅ Skip Links
✅ Color Contrast Validation
✅ Screen Reader Support
✅ Form Accessibility
✅ Image Alt Text
✅ Heading Structure
✅ Focus Management
✅ Dynamic Content Announcement

## Available Decorators

```typescript
@AccessibleName('Button Label')
@ScreenReaderOptimized()
@KeyboardNavigable('#target-id')
@WCAGCompliance('AA')
@AriaRole(AriaRole.BUTTON)
@AriaLabel('Close button')
```

## File Locations

```
src/
├── i18n/
│   ├── i18n.module.ts
│   ├── services/i18n.service.ts
│   ├── controllers/i18n.controller.ts
│   ├── middleware/language-detection.middleware.ts
│   └── translations/ (15 JSON files)
├── accessibility/
│   ├── accessibility.module.ts
│   ├── services/
│   │   ├── accessibility.service.ts
│   │   ├── accessibility-testing.service.ts
│   │   └── rtl.service.ts
│   ├── controllers/accessibility.controller.ts
│   ├── decorators/accessibility.decorators.ts
│   └── utils/accessibility-test-utils.ts
└── app.module.ts (updated)
```

## Documentation

- **Full Guide**: See `ACCESSIBILITY_AND_I18N_GUIDE.md`
- **Summary**: See `ACCESSIBILITY_I18N_IMPLEMENTATION_SUMMARY.md`
- **File Manifest**: See `FILES_CREATED_MANIFEST.md`

## Common Tasks

### Add a New Language

1. Create `src/i18n/translations/{lang}.json`
2. Use format from `en.json` as template
3. Service automatically loads new language file on restart

### Add New Translation Keys

1. Edit translation JSON files
2. Add new key in required languages
3. Use with: `i18nService.translate('new.key', language)`

### Add Accessibility to Endpoint

```typescript
@Get('protected')
@WCAGCompliance('AA')
@ScreenReaderOptimized()
@KeyboardNavigable()
getProtected() {
  // Endpoint with accessibility support
}
```

### Test for Accessibility Issues

```typescript
const results = await this.testingService.runComprehensiveAudit(html);
const report = this.testingService.generateReport(results);
console.log(report);
```

## API Response Examples

### Language Detection
```json
{
  "detected": "es",
  "metadata": {
    "code": "es",
    "name": "Español",
    "rtl": false,
    "region": "ES"
  },
  "rtl": false
}
```

### Translation
```json
{
  "key": "common.welcome",
  "language": "fr",
  "translation": "Bienvenue"
}
```

### Contrast Check
```json
{
  "ratio": 21,
  "meetsAA": true,
  "meetsAAA": true
}
```

### Accessibility Audit
```json
{
  "summary": {
    "totalIssues": 2,
    "wcagCompliant": false,
    "score": 83.5
  },
  "issues": [...],
  "recommendations": [...]
}
```

## Troubleshooting

### Language Not Detected
- Check Accept-Language header is being sent
- Verify language code is ISO 639-1 format
- Check if language exists in SUPPORTED_LANGUAGES

### RTL Layout Issue
- Ensure `dir="rtl"` is on root element
- Use logical CSS properties (inline-start/end)
- Verify with `rtlService.isRTL(language)`

### Screen Reader Not Announcing
- Check for `aria-hidden="true"` hiding content
- Add `aria-label` or `aria-labelledby`
- Use `aria-live` for dynamic content

## Next Steps

1. ✅ Install and build the project
2. ✅ Test endpoints with provided examples
3. ✅ Integrate i18n into your controllers
4. ✅ Add accessibility attributes to components
5. ✅ Test with screen readers (NVDA, JAWS, VoiceOver)
6. ✅ Run accessibility audit on your endpoints
7. ✅ Deploy to production

## Support

For detailed documentation and implementation examples, refer to:
- `ACCESSIBILITY_AND_I18N_GUIDE.md` - Complete guide with examples
- `ACCESSIBILITY_I18N_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `FILES_CREATED_MANIFEST.md` - Complete file listing

---

**Status**: Production Ready ✅
**Implementation Date**: January 22, 2026
**Support**: Full documentation included
