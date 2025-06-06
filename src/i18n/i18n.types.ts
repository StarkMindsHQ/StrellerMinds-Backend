import { Path } from 'nestjs-i18n';

// Define the structure of your translation files
export type I18nTranslations = {
  common: {
    welcome: string;
    success: string;
  };
  error_messages: {
    validation: {
      invalidFormat: string;
    };
    common: {
      internalServerError: string;
    };
    // Add other error messages as they appear in your error_messages.json/yaml
    // Example:
    // notFound: string;
  };
  errors: {
    INVALID_INPUT: string;
  };
  // Add other translation namespaces/keys as defined in your i18n files
  // Example:
  // user: {
  //   profile: {
  //     updated: string;
  //   };
  // };
};

// Optional: A helper type for type-safe translation keys
export type TranslationKey = Path<I18nTranslations>;