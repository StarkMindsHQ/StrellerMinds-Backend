import { beforeEach, describe, expect, it } from '@jest/globals';
import { I18nService } from './i18n.service';

describe('I18nService enhancements', () => {
  let service: I18nService;

  beforeEach(() => {
    service = new I18nService();
  });

  it('returns RTL context for Arabic', () => {
    const context = service.getLanguageContext('ar');

    expect(context.language).toBe('ar');
    expect(context.direction).toBe('rtl');
    expect(context.rtl).toBe(true);
  });

  it('resolves language from explicit input first', () => {
    const resolved = service.resolveLanguage('fr', 'en-US,en;q=0.8');
    expect(resolved).toBe('fr');
  });

  it('falls back to header detection when no explicit language', () => {
    const resolved = service.resolveLanguage(undefined, 'de-DE,de;q=0.8,en;q=0.7');
    expect(resolved).toBe('de');
  });
});
