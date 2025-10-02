# Translation Guide

This document outlines the process for managing translations in the application.

## Supported Languages

The application currently supports the following languages:

- English (en) - Default language
- Spanish (es)
- Arabic (ar) - RTL support

## Translation File Structure

Translation files are located in `src/i18n/i18n/` and follow this structure:

```
src/i18n/i18n/
├── en.json
├── es.json
└── ar.json
```

Each translation file is organized into namespaces:

```json
{
  "common": {
    "welcome": "Welcome"
  },
  "auth": {
    "login": "Login"
  }
}
```

## Adding New Translations

1. Identify the text that needs translation
2. Add the translation key to all language files
3. Use the translation key in your code:

```typescript
// In a controller or service
@I18nLang() lang: string;
const message = await this.i18nService.translate('common.welcome', { lang });
```

## Translation Workflow

1. **Extracting Strings**
   - Identify user-facing strings in the code
   - Create appropriate translation keys
   - Add translations to all language files

2. **Adding New Languages**
   - Create a new translation file (e.g., `fr.json`)
   - Add the language to the supported languages list
   - Update the language selection UI

3. **Quality Assurance**
   - Review translations for accuracy
   - Test RTL support for Arabic
   - Verify all keys are present in all language files

## RTL Support

For RTL languages (like Arabic):

1. Use CSS `direction: rtl` for RTL content
2. Test layout and alignment
3. Ensure proper text alignment in forms and inputs

## API Endpoints

### Get Available Languages

```http
GET /i18n/languages
```

### Set User Language

```http
POST /i18n/set-language
{
  "language": "es"
}
```

### Get Translations

```http
GET /i18n/translations
```

## Best Practices

1. **Key Naming**
   - Use dot notation for nested keys
   - Use lowercase with underscores
   - Group related translations in namespaces

2. **Variables**
   - Use named variables: `{{variableName}}`
   - Provide default values
   - Document variable usage

3. **Maintenance**
   - Keep translation files in sync
   - Remove unused translations
   - Document new translation keys

4. **Testing**
   - Test all supported languages
   - Verify RTL support
   - Check variable interpolation

## Adding a New Language

1. Create a new translation file:

```json
{
  "common": {
    "welcome": "Translation"
  }
}
```

2. Update the language list in `I18nController`:

```typescript
languages: [
  { code: 'en', name: 'English', isRTL: false },
  { code: 'es', name: 'Español', isRTL: false },
  { code: 'ar', name: 'العربية', isRTL: true },
  { code: 'fr', name: 'Français', isRTL: false }, // New language
];
```

3. Add the language to the fallbacks in `I18nModule`:

```typescript
fallbacks: {
  'en-*': 'en',
  'es-*': 'es',
  'ar-*': 'ar',
  'fr-*': 'fr', // New language
}
```

## Troubleshooting

1. **Missing Translations**
   - Check if the key exists in all language files
   - Verify the key is correctly referenced
   - Check for typos in the key name

2. **RTL Issues**
   - Verify CSS direction property
   - Check text alignment
   - Test form inputs and buttons

3. **Variable Interpolation**
   - Ensure all required variables are provided
   - Check variable names match
   - Verify variable format in translation files
