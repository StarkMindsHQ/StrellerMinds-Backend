const fallbackLang = 'en';

export function detectLanguageFromHeader(header?: string): string {
  const detected = detectLanguageFromHeader(header);
  return detected || fallbackLang;
}
